package controllers

import play.api._
import play.api.mvc._
import scala.util.{Try, Success, Failure, Random}
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import scala.concurrent.Future

import models._
import services._

import play.api.libs.json._

// import reactivemongo.api._
// import reactivemongo.bson._
import play.modules.reactivemongo.MongoController
import play.modules.reactivemongo.json.collection._

import reactivemongo.bson._
import play.modules.reactivemongo.json.BSONFormats._




object Application extends Controller with MongoController {
  import JsonFormats._

  def userCollection = db.collection[JSONCollection]("users")
  def mosaicCollection = db.collection[JSONCollection]("mosaics")
  def themeCollection = db.collection[JSONCollection]("themes")
  def stockCollection = db.collection[JSONCollection]("stocks")


  def index(filename: String) = Action {
    filename match {
      case "" => Ok(views.html.index(""))
      case f: String => Ok(views.html.index(f))
    }
  }

  def ui = Action {
    Ok(views.html.ui(""))
  }


  def interactive = Action {
    Ok(views.html.interactive(""))
  }

  // def dropbox = Action.async(parse.json) { implicit request =>
  //   getMosaic flatMap { _ map { mosaic =>
  //       Dropbox.download(request.body) flatMap { addToMosaic(mosaic, _) }
  //     } getOrElse(Future(BadRequest))
  //   }
  // }


  def stock = Action.async {
    stockCollection.find(Json.obj()).cursor[Stock].collect[List]() map { stocks =>
      Ok(Json.toJson(stocks))
    }
  }

  def themes = Action.async {
    themeCollection.find(Json.obj()).cursor[Theme].collect[List]() map { themes =>
      Ok(Json.toJson(themes))
    }
  }

}

object Feedback extends Controller with MongoController {

  import JsonFormats._

  def questionCollection = db.collection[JSONCollection]("questions")
  def feedbackCollection = db.collection[JSONCollection]("feedbacks")
  def contactCollection = db.collection[JSONCollection]("contacts")

  
  def questions = Action.async {
    questionCollection.find(Json.obj()).cursor[FeedbackQuestion].collect[List]() map { questions =>
      Ok(Json.toJson(questions))
    }
  }

  def feedback = Action.async(parse.json) { request =>
    feedbackCollection.save(Json.toJson(request.body)) map { lastError =>
      Ok
    }
  }

  // def textFeedback = Action.async(parse.json) { request =>
  //   val user_id = request.session.get("user") map (BSONObjectID(_))
  //   feedbackCollection.save(request.body.as[TextFeedback].copy(user_id = user_id)) map { lastError =>
  //     Ok
  //   }
  // }

  // def contact = Action.async(parse.json) { request =>
  //   val user_id = request.session.get("user") map (BSONObjectID(_))
  //   contactCollection.save(request.body.as[ContactFeedback].copy(user_id=user_id)) map { lastError =>
  //     Ok
  //   }
  // }

  def contact = Action.async(parse.urlFormEncoded) { request =>
    contactCollection.save(Json.toJson(request.body)) map { lastError =>
      Ok
    }
  }
}


abstract class CRUDController[T <: IDModel[T]] extends Controller with MongoController {

  def _collection: JSONCollection
  implicit val format: Format[T]

  object DBA {
    def create(item: T) = {
      val created = item.withID(BSONObjectID.generate)
      _collection.save(created) map { lastError =>
        created
      }
    }

    def update(id: BSONObjectID, item: T) = {
      val updated = item.withID(id)
      _collection.save(updated) map { lastError =>
        updated
      }
    }

    def list = _collection.find(Json.obj()).cursor[T].collect[List]()
    def get(id: BSONObjectID) = _collection.find(Json.obj("_id" -> id)).one[T]
    def delete(id: BSONObjectID) = _collection.remove(Json.obj("_id" -> id))
  }


  def create = Action.async(parse.json) { request =>
    DBA.create(request.body.as[T]) map { item =>
      Ok(Json.toJson(item))
    }
  }

  def list = Action.async {
    DBA.list map { list =>
      Ok(Json.toJson(list))
    }
  }

  def get(id: String) = Action.async {
    DBA.get(BSONObjectID(id)) map { item =>
      Ok(Json.toJson(item))
    }
  }

  def update(id: String) = Action.async(parse.json) { request =>
    DBA.update(BSONObjectID(id), request.body.as[T]) map { item =>
      Ok(Json.toJson(item))
    }
  }

  def delete(id: String) = Action.async {
    DBA.delete(BSONObjectID(id)) map { lastError =>
      Ok
    }
  }
}


object Users extends CRUDController[User] {
  implicit val format = Json.format[User]
  def _collection = db.collection[JSONCollection]("users")

  def send(user_id: String, mosaic_id: String) = Action(parse.json) { implicit request =>
    implicit val emailFormat = Json.format[Email]

    val req = request.body.as[Email]

    _collection.update(Json.obj("_id" -> BSONObjectID(user_id)), Json.obj("$set" -> Json.obj("email" -> req.from)))
    EmailService.sendToFriend(req.to, req.from, mosaic_id)
    Ok
  }

  def download(user_id: String, mosaic_id: String) = Action.async(parse.urlFormEncoded) { implicit request =>
    request.body.get("email") map(_.head) map { email =>
      _collection.update(Json.obj("_id" -> BSONObjectID(user_id)), Json.obj("$set" -> Json.obj("email" -> email)))
      Mosaics.DBA.get(BSONObjectID(mosaic_id)) map {
        case Some(mosaic) =>
          MosaicService.renderMosaic(mosaic) map { filename =>
          EmailService.sendToSelf(email, mosaic._id.get.stringify)
          Ok.sendFile(MosaicService.getMosaicFile(filename))
        } getOrElse(BadRequest)
      }
    } getOrElse(Future(BadRequest))
  }

  def order(user_id: String, mosaic_id: String) = Action(parse.urlFormEncoded) { implicit request =>
    Ok
  }
}


object Collections extends CRUDController[Collection] {
  implicit val format = Json.format[Collection]
  def _collection = db.collection[JSONCollection]("collections")

  val baseDir = "/storage/thumb/"

  def addUser(id: String, user_id: String) = Action.async {
    _collection.update(Json.obj("_id" -> BSONObjectID(id)),
      Json.obj("$addToSet" -> Json.obj("users" -> BSONObjectID(user_id)))) map { lastError =>
        Ok
    }
  }

  def removeUser(id: String, user_id: String) = Action.async {
    _collection.update( Json.obj("_id" -> BSONObjectID(id)),
      Json.obj("$pull" -> Json.obj("users" -> BSONObjectID(user_id)))) map { lastError =>
        Ok
    }
  }

  def fromUser(id: String) = Action.async {
    _collection.find(Json.obj("users" -> BSONObjectID(id))).cursor[Collection].collect[List]() map {
      list => Ok(Json.toJson(list))
    }
  }

  def withUser(id: String) = Action.async {
    DBA.create(new Collection(List(BSONObjectID(id)))) map { item =>
      Ok(Json.toJson(item))
     }
  }

  def addPhotos(id: String) = Action.async(parse.multipartFormData) { request =>
    Future(ImageService.saveImages(request.body.files.map(_.ref).toList)) map { names =>
      _collection.update(Json.obj("_id" -> BSONObjectID(id)),
        Json.obj("$addToSet" -> Json.obj("photos" -> Json.obj("$each" -> names))))
      MosaicService.preprocess(names)
      Ok(Json.toJson(Json.obj("filenames" -> names.map(baseDir + _))))
    }
  }
}


object Mosaics extends CRUDController[Mosaic] {
  implicit val tileformat = Json.format[Tile]
  implicit val format = Json.format[Mosaic]
  def _collection = db.collection[JSONCollection]("mosaics")

  def generateFromCollection(id: String) = Action.async {
    Collections.DBA.get(BSONObjectID(id)) flatMap {
      _ flatMap { col =>
        MosaicService.generateMosaic(new Mosaic(col), col.photos)
      } map { mosaic =>
        _collection.save(mosaic) map { lastError =>
          Ok(Json.toJson(mosaic))
        }
      } getOrElse(Future(InternalServerError))
    }
  }
}
