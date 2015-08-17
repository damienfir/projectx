package controllers

import javax.inject.Inject

import play.api._
import play.api.mvc._
import scala.util.{Try, Success, Failure}
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import scala.concurrent.Future

import models._
import services._

import play.api.libs.json._


class Application extends Controller {

  // def feedbackCollection = db.collection[JSONCollection]("feedbacks")
  // def contactCollection = db.collection[JSONCollection]("contacts")


  def index(filename: String) = Action {
    Ok(views.html.index(filename))
  }

  def ui = Action {
    Ok(views.html.interactive())
  }

  // def feedback = Action.async(parse.json) { request =>
  //   feedbackCollection.save(Json.toJson(request.body)) map { lastError =>
  //     Ok
  //   }
  // }

  // def contact = Action.async(parse.urlFormEncoded) { request =>
  //   contactCollection.save(Json.toJson(request.body)) map { lastError =>
  //     Ok
  //   }
  // }
}


// abstract class CRUDController[T <: IDModel[T]] extends Controller {

//   import play.modules.reactivemongo.json.BSONFormats._
//   lazy val db = Play.current.injector.instanceOf[ReactiveMongoApi].db
//   def _collection: JSONCollection
//   implicit val format: Format[T]

//   object DBA {
//     def create(item: T) = {
//       val created = item.withID(BSONObjectID.generate)
//       _collection.save(created) map { wr =>
//         created
//       }
//     }

//     def update(id: String, item: T) = {
//       val updated = item.withID(BSONObjectID(id))
//       _collection.save(updated) map { lastError =>
//         updated
//       }
//     }

//     def list = _collection.find(Json.obj()).cursor[T].collect[List]()
//     def get(id: String) = _collection.find(Json.obj("_id" -> BSONObjectID(id))).one[T]
//     def delete(id: String) = _collection.remove(Json.obj("_id" -> BSONObjectID(id)))
//   }


//   def create = Action.async(parse.json) { implicit request =>
//     DBA.create(request.body.as[T]) map { item =>
//       Ok(Json.toJson(item))
//     }
//   }

//   def list = Action.async {
//     DBA.list map { list =>
//       Ok(Json.toJson(list))
//     }
//   }

//   def get(id: String) = Action.async {
//     DBA.get(id) map {
//       case Some(item) => Ok(Json.toJson(item))
//       case None => NotFound
//     }
//   }

//   def update(id: String) = Action.async(parse.json) { request =>
//     DBA.update(id, request.body.as[T]) map { item =>
//       Ok(Json.toJson(item))
//     }
//   }

//   def delete(id: String) = Action.async {
//     DBA.delete(id) map { lastError =>
//       Ok
//     }
//   }
// }


trait CRUDActions[T <: DB.HasID] extends Controller {
  implicit val format: Format[T]

  def getAction(query: Future[Option[T]]) = Action.async {
    query map {
      case Some(item) => Ok(Json.toJson(item))
      case None => NotFound
    }
  }

  def saveAction(insertQuery: T => Future[T], updateQuery: T => Future[Try[T]]) = Action.async(parse.json) { request =>
    val item = request.body.as[T]
    (item.id match {
      case Some(id) => updateQuery(item)
      case None => Success(insertQuery(item))
    }).map {
      case Success(item) => Ok(Json.toJson(item))
      case Failure(_) => BadRequest
    }
  }

  def listAction(query: Future[Seq[T]]) = Action.async {
    query map { items =>
      Ok(Json.toJson(items))
    }
  }

  def deleteAction(query: Future[Int]) = Action.async {
    query map {
      case 1 => Ok
      case 0 => NotFound
    }
  }
}


class Users @Inject()(usersDAO: UsersDAO) extends Controller with CRUDActions[DB.User] {
  implicit val format = Json.format[DB.User]
  
  def get(id: Long) = getAction(usersDAO.get(id))
  def save = saveAction(usersDAO.insert, usersDAO.update)
  def list = listAction(usersDAO.list)
  def delete(id: Long) = deleteAction(usersDAO.delete(id))


//   def send(user_id: String, mosaic_id: String) = Action(parse.json) { implicit request =>
//     request.body.asOpt[Email] map { req =>
//       _collection.update(Json.obj("_id" -> user_id), Json.obj("$set" -> Json.obj("email" -> req.from)))
//       EmailService.sendToFriend(req.to, req.from, mosaic_id)
//       Ok
//     } getOrElse(InternalServerError)
//   }

//   def download(user_id: String, mosaic_id: String, email: String) = Action.async { implicit request =>
//     request.queryString.get("email") map(_.head) map { email =>
//       _collection.update(Json.obj("_id" -> user_id), Json.obj("$set" -> Json.obj("email" -> email)))
//       Mosaics.DBA.get(mosaic_id) map {
//         case Some(mosaic) =>
//           EmailService.sendToSelf(email, mosaic._id.get.stringify)
//           Ok.sendFile(MosaicService.getMosaicFile(mosaic_id + ".jpg"))
//       }
//     } getOrElse(Future(BadRequest))
//   }
}


// object Collections extends CRUDController[Collection] {
//   import play.modules.reactivemongo.json.BSONFormats._
//   def _collection = db.collection[JSONCollection]("collections")
//   implicit val format = Json.format[Collection]

//   // val baseDir = "/storage/thumb/"

//   def addUser(id: String, user_id: String) = Action.async {
//     Users.DBA.get(user_id) flatMap {
//       case Some(user) => _collection.update(Json.obj("_id" -> BSONObjectID(id)),
//         Json.obj("$addToSet" -> Json.obj("users" -> user._id))) map { lastError =>
//           Ok
//         }
//       case None => Future(NotFound)
//     }
//   }

//   def removeUser(id: String, user_id: String) = Action.async {
//     _collection.update(Json.obj("_id" -> BSONObjectID(id)),
//       Json.obj("$pull" -> Json.obj("users" -> user_id))) map { lastError =>
//         Ok
//     }
//   }

//   def fromUser(id: String) = Action.async {
//     _collection.find(Json.obj("users" -> BSONObjectID(id))).cursor[Collection].collect[List]() map {
//       list => Ok(Json.toJson(list))
//     }
//   }

//   def withUser(id: String) = Action.async {
//     DBA.create(new Collection(List(BSONObjectID(id)))) map { item =>
//       Ok(Json.toJson(item))
//     }
//   }

//   def addPhotos(id: String) = Action.async(parse.multipartFormData) { request =>
//     Future(ImageService.saveImages(request.body.files.map(_.ref))) flatMap { names =>
//       _collection.update(Json.obj("_id" -> BSONObjectID(id)),
//         Json.obj("$addToSet" -> Json.obj("photos" -> Json.obj("$each" -> names)))) map { wr =>
//           MosaicService.preprocess(names)
//           Ok(Json.toJson(Json.obj("filenames" -> names)))
//         }
//     }
//   }
// }


// object Mosaics extends CRUDController[Mosaic] {
//   import play.modules.reactivemongo.json.BSONFormats._
//   def _collection = db.collection[JSONCollection]("mosaics")
//   implicit val format = Json.format[Mosaic]

//   def generateFromCollection(id: String) = Action.async {
//     Collections.DBA.get(id) flatMap {
//       _ flatMap { col =>
//         MosaicService.generateMosaic(new Mosaic(col), col.photos)
//       } map { mosaic =>
//         _collection.save(mosaic) map { lastError =>
//           Ok(Json.toJson(mosaic))
//         }
//       } getOrElse(Future(InternalServerError))
//     }
//   }

//   def generate = Action(parse.json) { request =>
//     val mosaic = request.body.as[Mosaic]
//     MosaicService.replaceMosaic(mosaic)
//     MosaicService.renderMosaic(mosaic) map (_ => Ok(Json.toJson(mosaic))) getOrElse (InternalServerError)
//   }
// }
