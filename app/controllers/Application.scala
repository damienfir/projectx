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


  private def getUser(implicit request: Request[_]): Future[Option[User]] = request.session.get("user") match {
    case Some(user_id) => userCollection.find(Json.obj("_id" -> Json.obj("$oid" -> user_id))).one[User]
    case None => Future(None)
  }


  private def getOrCreateUser(implicit request: Request[_]): Future[User] = getUser flatMap {
    case Some(user) => Future(user)
    case None => {
      val user = User(Some(BSONObjectID.generate), None)
      userCollection.insert(user) map { _ =>
        user
      }
    }
  }

  // private def getMosaicFromID(id: String): Future[Option[Mosaic]] = {
  //   mosaicCollection.find(Json.obj("_id" -> Json.obj("$oid" -> id))).one[Mosaic]
  // }

  // private def getMosaic(implicit request: Request[_]): Future[Option[Mosaic]] = {
  //   request.session.get("mosaic") match {
  //     case Some(mosaic_id) => getMosaicFromID(mosaic_id)
  //     case None => Future(None)
  //   }
  // }


  def index(filename: String) = Action {
    filename match {
      case "" => Ok(views.html.index(""))
      case f: String => Ok(views.html.index(f))
    }
  }

  def ui = Action {
    Ok(views.html.ui(""))
  }


  // def reset = Action.async { implicit request =>
  //   getOrCreateUser flatMap {  user =>
  //     val id = BSONObjectID.generate
  //     mosaicCollection.insert(Mosaic(Some(id), user._id.get, None, None, List())) map { _ =>
  //       Ok.withSession(
  //         "user" -> user._id.get.stringify,
  //         "mosaic" -> id.stringify
  //       )
  //     }
  //   }
  // }


  // def upload = Action.async(parse.multipartFormData) { implicit request =>
  //   getMosaic flatMap { _ map { mosaic =>
  //     MosaicService.saveImages(request.body.files.map(_.ref).toList) map { names =>
  //         addToMosaic(mosaic, names)
  //         println(names map (n => s"/storage/thumb/$n"))
  //         Ok(Json.stringify(Json.arr(names map ("/storage/thumb/" + _))))
  //       }
  //     } getOrElse(Future(BadRequest))
  //   }
  // }


  // def process = Action.async { implicit request =>
  //   getMosaic flatMap { _ map { mosaic =>
  //       MosaicService.process(mosaic) flatMap {
  //         case Success(processed) =>
  //           mosaicCollection.save(processed) map { lastError =>
  //             Ok(Json.toJson(processed).toString)
  //           }
  //         case Failure(e) => Future(InternalServerError)
  //       }
  //     } getOrElse(Future(BadRequest))
  //   }
  // }


  // def dropbox = Action.async(parse.json) { implicit request =>
  //   getMosaic flatMap { _ map { mosaic =>
  //       Dropbox.download(request.body) flatMap { addToMosaic(mosaic, _) }
  //     } getOrElse(Future(BadRequest))
  //   }
  // }


  // private def addToMosaic(mosaic: Mosaic, names: List[String]): Future[Result] = {
  //   mosaicCollection.save(mosaic.copy(images = mosaic.images ++ names)) map { _ => Ok }
  // }

  // def download = Action.async(parse.urlFormEncoded) { implicit request =>
  //   request.body.get("email") map(_.head) map { email =>
  //     getUser map {
  //       case Some(user) => userCollection.save(user.copy(email = Some(email)))
  //     }
  //     getMosaic map {
  //       case Some(mosaic) =>
  //         EmailService.sendToSelf(email, mosaic._id.get.stringify)
  //         mosaic.filename map { fname =>
  //           Ok.sendFile(MosaicService.getFile(fname))
  //         } getOrElse(BadRequest)
  //     }
  //   } getOrElse(Future(BadRequest))
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

  def collection: JSONCollection
  implicit val format: Format[T]

  object DBA {
    def create(item: T) = {
      val created = item.withID(BSONObjectID.generate)
      collection.save(created) map { lastError =>
        created
      }
    }

    def update(id: BSONObjectID, item: T) = {
      val updated = item.withID(id)
      collection.save(updated) map { lastError =>
        updated
      }
    }

    def list = collection.find(Json.obj()).cursor[T].collect[List]()
    def get(id: BSONObjectID) = collection.find(Json.obj("_id" -> id)).one[T]
    def delete(id: BSONObjectID) = collection.remove(Json.obj("_id" -> id))
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
  def collection = db.collection[JSONCollection]("users")

  def send(user_id: String, mosaic_id: String) = Action(parse.json) { implicit request =>
    implicit val emailFormat = Json.format[Email]

    val req = request.body.as[Email]

    collection.update(Json.obj("_id" -> BSONObjectID(user_id)), Json.obj("$set" -> Json.obj("email" -> req.from)))
    EmailService.sendToFriend(req.to, req.from, mosaic_id)
    Ok
  }

  def download(user_id: String, mosaic_id: String) = Action.async(parse.urlFormEncoded) { implicit request =>
    request.body.get("email") map(_.head) map { email =>
      collection.update(Json.obj("_id" -> BSONObjectID(user_id)), Json.obj("$set" -> Json.obj("email" -> email)))
      Mosaics.DBA.get(BSONObjectID(mosaic_id)) map {
        case Some(mosaic) =>
          EmailService.sendToSelf(email, mosaic._id.get.stringify)
          mosaic.filename map { fname =>
            Ok.sendFile(MosaicService.getMosaicFile(fname))
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
  def collection = db.collection[JSONCollection]("collections")

  val baseDir = "/storage/thumb/"

  def addUser(id: String, user_id: String) = Action.async {
    collection.update(Json.obj("_id" -> BSONObjectID(id)),
      Json.obj("$addToSet" -> Json.obj("users" -> BSONObjectID(user_id)))) map { lastError =>
        Ok
    }
  }

  def removeUser(id: String, user_id: String) = Action.async {
    collection.update( Json.obj("_id" -> BSONObjectID(id)),
      Json.obj("$pull" -> Json.obj("users" -> BSONObjectID(user_id)))) map { lastError =>
        Ok
    }
  }

  def fromUser(id: String) = Action.async {
    collection.find(Json.obj("users" -> BSONObjectID(id))).cursor[Collection].collect[List]() map {
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
      collection.update(Json.obj("_id" -> BSONObjectID(id)),
        Json.obj("$addToSet" -> Json.obj("photos" -> Json.obj("$each" -> names))))
      MosaicService.preprocess(names)
      Ok(Json.toJson(Json.obj("filenames" -> names.map(baseDir + _))))
    }
  }
}


object Mosaics extends CRUDController[Mosaic] {
  implicit val format = Json.format[Mosaic]
  def collection = db.collection[JSONCollection]("mosaics")

  val baseDir = "/storage/generated/"

  def generateFromSubset(id: String) = Action.async {
    Subsets.DBA.get(BSONObjectID(id)) flatMap { subset =>
      DBA.create(new Mosaic(subset.get)) flatMap { mosaic =>
        MosaicService.generateMosaic(mosaic, subset.get) flatMap {
          case Some(processed) =>
            collection.save(processed) map { lastError =>
              Ok(Json.toJson(processed))
            }
          case None => Future(InternalServerError)
        }
      }
    }
  }
}


object Subsets extends CRUDController[Subset] {
  implicit val format = Json.format[Subset]
  def collection = db.collection[JSONCollection]("subsets")

  def createFromCollection(id: String) = Action.async {
    println(id)
    Collections.DBA.get(BSONObjectID(id)) map { col =>
      println(col)
      MosaicService.cluster(col.get.photos, id) map { cluster =>
        println(cluster)
        DBA.create(Subset(None, cluster.sorted map (cluster.gists(_))))
        Ok
      } getOrElse (InternalServerError)
    }
  }
}
