package controllers

import javax.inject.Inject

import play.api._
import play.api.mvc._
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import scala.concurrent.Future

import models._
import services._

import play.api.libs.json._


class Application extends Controller {

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


class Users @Inject()(usersDAO: UsersDAO) extends Controller with CRUDActions[DB.User] {
  implicit val format = Json.format[DB.User]
  
  def get(id: Long) = getAction(usersDAO.get(id))
  def save = saveAction(usersDAO.insert, usersDAO.update)
  // def list = listAction(usersDAO.list)
  // def delete(id: Long) = deleteAction(usersDAO.delete(id))


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


class Collections @Inject()(collectionDAO: CollectionDAO) extends Controller {
  implicit val format = Json.format[DB.Collection]

  def fromUser(id: Long) = Action.async {
    collectionDAO.fromUser(id) map (items => Ok(Json.toJson(items)))
  }

  def withUser(id: Long) = Action.async {
    collectionDAO.withUser(id) map {
      case Some(item) => Ok(Json.toJson(item))
      case None => NotFound
    }
  }
}


class Photos @Inject()(photoDAO: PhotoDAO) extends Controller {
  implicit val format = Json.format[DB.Photo]

  def addToCollection(id: Long) = Action.async(parse.multipartFormData) { request =>
    val list = for {
      names <- ImageService.saveImages(request.body.files.map(_.ref))
      photos <- photoDAO.addToCollection(id, names)
      processed <- MosaicService.preprocessAll(names)
    } yield photos
    list map (items => Ok(Json.toJson(items)))
  }
}


class Compositions @Inject()(compositionDAO: CompositionDAO, collectionDAO: CollectionDAO, photoDAO: PhotoDAO) extends Controller {
  implicit val format = Json.format[DB.Composition]

  def generateFromCollection(id: Long) = Action.async {
    val composition = for {
      comp <- compositionDAO.addWithCollection(id)
      photos <- photoDAO.allFromCollection(id)
      (subset, tiles) <- MosaicService.generateComposition(comp.id.get, photos map (_.hash))
      c <- compositionDAO.update(comp.copy(photos = subset, tiles = tiles))
    } yield c
    composition map (c => Ok(Json.toJson(c))) fallbackTo (Future(Ok))
  }

  def generate = Action.async(parse.json) { request =>
    val composition = request.body.as[DB.Composition]
    val out = for {
      c <- compositionDAO.update(composition)
      a <- MosaicService.renderOtherComposition(c.id.get.toString, c.tiles)
    } yield a
    out map (_ => Ok)
  }
}
