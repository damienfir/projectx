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
}


class Users @Inject()(usersDAO: UsersDAO) extends Controller with CRUDActions[DBModels.User] {
  implicit val format = Json.format[DBModels.User]
  
  def get(id: Long) = getAction(usersDAO.get(id))
  def save = saveAction(usersDAO.insert, usersDAO.update)

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


class Collections @Inject()(compositionDAO: CompositionDAO, collectionDAO: CollectionDAO, photoDAO: PhotoDAO, imageService: ImageService, mosaicService: MosaicService) extends Controller {
  implicit val collectionFormat = Json.format[DBModels.Collection]
  implicit val photoFormat = Json.format[DBModels.Photo]
  implicit val compositionFormat = Json.format[DBModels.Composition]


  def fromUser(id: Long) = Action.async {
    collectionDAO.fromUser(id) map (items => Ok(Json.toJson(items)))
  }


  def withUser(id: Long) = Action.async {
    collectionDAO.withUser(id) map {
      case Some(item) => Ok(Json.toJson(item))
      case None => NotFound
    }
  }


  def addToCollection(id: Long) = Action.async(parse.multipartFormData) { request =>
    val list = for {
      names <- imageService.saveImages(request.body.files.map(_.ref))
      photos <- photoDAO.addToCollection(id, names)
      processed <- mosaicService.preprocessAll(names)
    } yield photos
    list map (items => Ok(Json.toJson(items)))
  }


  def divideIntoPages(photos: Seq[DBModels.Photo]): List[(Seq[DBModels.Photo],Int)] = photos.grouped(3).toList.zipWithIndex


  def generateComposition(id: Long, photos: List[DBModels.Photo], index: Int): Future[DBModels.Composition] = {
    for {
      comp <- compositionDAO.addWithCollection(id)
      (subset, tiles) <- mosaicService.generateComposition(comp.id.get, photos map (_.hash))
      c <- compositionDAO.update(comp.copy(photos = subset, tiles = tiles, index = index))
    } yield c
  }


  def generatePages(id: Long, startindex: Int) = Action.async(parse.json) { request =>
    Future.sequence(
      divideIntoPages(request.body.as[List[DBModels.Photo]])
        .map({case (subset, index) => generateComposition(id, subset.toList, startindex+index)})
      ).map(pages => Ok(Json.toJson(pages)))
  }


  def download(id: Long) = Action.async(parse.json) { request =>
    Future.sequence(
      request.body.as[List[DBModels.Composition]]
      .map(c => mosaicService.renderOtherComposition(c.id.get.toString, c.tiles, c.photos))
    ).map(mosaicService.makeAlbum)
      .map(value => Ok(Json.toJson(value)))
  }
}
