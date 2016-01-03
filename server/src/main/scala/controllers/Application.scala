package controllers

import javax.inject.Inject

import play.api._
import play.api.mvc._
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import scala.concurrent.Future
import scala.util.Random
import scala.util.{Try, Success, Failure}
import play.api.i18n._

import models._
import services._

import play.api.libs.json._


class Application @Inject()(val messagesApi: MessagesApi) extends Controller with I18nSupport {

  def index(lang: Option[String]) = Action { implicit request =>
    val id = Play.current.configuration.getString("px.demoID").get
    Ok(views.html.index(id))
  }

  def ui = Action { implicit request =>
    val id = Play.current.configuration.getString("px.demoID").get
    Ok(views.html.interactive(id))
  }

  def uiWithHash(hash: String) = ui
}


class Payment @Inject()(braintree: Braintree, email: Email) extends Controller {
  implicit val orderFormat = Json.format[APIModels.Order]
  implicit val infoFormat = Json.format[APIModels.Info]

  def getToken = Action.async {
    braintree.token.map(token => Ok(token))
  }

  def submitOrder = Action.async(parse.json) { request =>
    (request.body \ "order").asOpt[APIModels.Order] flatMap { order =>
      (request.body \ "info").asOpt[APIModels.Info] map { info =>
        braintree.order(order, info) map { trans =>
          email.confirmOrder(order, info) map (println(_))
          Ok(Json.obj("status" -> 1))
          } recover {
            case ex => BadRequest(ex.getMessage)
          }
      }
    } getOrElse { Future(BadRequest) }
  }
}


class Users @Inject()(usersDAO: UsersDAO) extends Controller with CRUDActions[DBModels.User] {
  implicit val format = Json.format[DBModels.User]
  
  def get(id: Long) = getAction(usersDAO.get(id))
  def save = saveAction(usersDAO.insert, usersDAO.update)
}


class Collections @Inject()(usersDAO: UsersDAO, compositionDAO: CompositionDAO, collectionDAO: CollectionDAO, photoDAO: PhotoDAO, imageService: ImageService, mosaicService: MosaicService, emailService: Email) extends Controller {
  implicit val collectionFormat = Json.format[DBModels.Collection]
  implicit val userFormat = Json.format[DBModels.User]
  implicit val photoFormat = Json.format[DBModels.Photo]
  implicit val compositionFormat = Json.format[DBModels.Composition]


  def fromUser(id: Long) = Action.async {
    collectionDAO.fromUser(id) map (items => Ok(Json.toJson(items)))
  }


  def withUser(id: Long) = Action.async {
    collectionDAO.withUser(id) map { item =>
      Ok(Json.toJson(item))
    } recover {
      case _ => NotFound
    }
  }

  def getAlbum(id: Long) = Action.async {
    val album = for {
      collection <- collectionDAO.get(id)
      pages <- compositionDAO.allFromCollection(collection.get.id.get)
      photos <- photoDAO.allFromCollection(collection.get.id.get)
    } yield Json.obj("collection" -> collection, "pages" -> pages, "photos" -> photos)
    album.map(obj => Ok(Json.toJson(obj)))
  }

  def getAlbumFromHash(userID: Long, hash: String) = Action.async {
    val album = for {
      collection <- collectionDAO.getByHash(userID, hash)
      pages <- compositionDAO.allFromCollection(collection.id.get)
      photos <- photoDAO.allFromCollection(collection.id.get)
    } yield Json.obj("collection" -> collection, "pages" -> pages, "photos" -> photos.map(_.copy(data=Array())))
    album.map(obj => Ok(Json.toJson(obj)))
  }


  def addToCollection(id: Long) = Action.async(parse.maxLength(1024*1024*1000*1000, parser=parse.multipartFormData)) { request =>
    // val list = for {
    //   photo <- photoDAO.addToCollection(id, imageService.bytesFromTemp(request.body.files.head.ref))
    //   // processed <- mosaicService.preprocessAll(names)
    // } yield photos
    // list map (items => Ok(Json.toJson(items)))
    request.body match {
      case Left(_) => Future(EntityTooLarge)
      case Right(body) => photoDAO.addToCollection(id, imageService.save(body.files.head.ref))
        .map(photo => Ok(Json.toJson(photo.copy(data=Array()))))
    }
  }


  def divideIntoPages(photos: List[DBModels.Photo]): List[(List[DBModels.Photo],Int)] =
    photos.grouped(3).toList.zipWithIndex


  def generateComposition(id: Long, photos: List[DBModels.Photo], index: Int): Future[DBModels.Composition] = {
    for {
      comp <- compositionDAO.addWithCollection(id)
      tiles <- mosaicService.generateComposition(comp.id.get, photos)
      c <- compositionDAO.update(comp.copy(tiles = tiles, index = index))
    } yield c
  }


  def shuffleComposition(id: Long, photos: List[DBModels.Photo], index: Int): Future[DBModels.Composition] = {
    for {
      comp <- compositionDAO.get(id)
      tiles <- mosaicService.generateComposition(id, photos)
    } yield comp.copy(tiles = tiles, index = index)
  }


  def shufflePage(id: Long, pageID: Long, index: Int) = Action.async(parse.json) { request =>
    shuffleComposition(pageID, request.body.as[List[DBModels.Photo]], index)
      .map(page => Ok(Json.toJson(page)))
  }


  def generatePage(id: Long, index: Int) = Action.async(parse.json) { request =>
    val photos = request.body.as[List[DBModels.Photo]]
    
      // val pagesWithCover = if (index == 0) {
      //   (List(photos(Random.nextInt(photos.size))), 0) :: pages.map({case (p,i) => (p,i+1)})
      // } else { pages }
      // Future.sequence {
      //   pagesWithCover.map({case (subset, index) => generateComposition(id, subset, startindex+index)})
      // }.map(pages => Ok(Json.toJson(pages)))
    // }

    generateComposition(id, photos, index) map (page => Ok(Json.toJson(page)))
  }

  def save(json: JsValue) = {
    val collection = (json \ "collection").as[DBModels.Collection]
    val compositions = (json \ "album").as[List[DBModels.Composition]]
    for {
      col <- collectionDAO.update(collection)
      album <- compositionDAO.updateAll(compositions)
      res <- compositionDAO.removeUnused(collection, compositions)
    } yield Ok(Json.toJson(collection))
  }

  def saveAlbum = Action.async(parse.json) { request =>
    save(request.body)
  }


  def emailLink(id: Long, hash: String) = Action.async(parse.json) { request =>
    val email = (request.body \ "email").as[String]
    emailService.sendLink(email, hash) map (Ok(_))
  }


  def download(id: Long) = Action.async(parse.json) { request =>
    val collection = (request.body \ "collection").as[DBModels.Collection]
    val compositions = (request.body \ "album").as[List[DBModels.Composition]]
    photoDAO.allFromCollection(id)
        .map(photos => photos.map(p => p.id.get -> mosaicService.photoFile(p.hash)).toMap)
        .map(photos => compositions.map(comp => views.html.page(comp, collection, photos).toString))
        .map(svgs => mosaicService.makeAlbum(svgs))
        .map(Ok(_))
  }

  def pdf(hash: String) = Action.async { request =>
    collectionDAO.getByHash(0, hash) flatMap { collection => 
      compositionDAO.allFromCollection(collection.id.get) flatMap { compositions =>
        val tiles = compositions.map(_.tiles).reduce((acc, t) => acc ++ t)
        photoDAO.allFromCollection(collection.id.get)
          .map(photos => photos.map(p => {
            val tile = tiles.find(t => t.photoID == p.id.get)
            p.id.get -> imageService.bytesToFile(imageService.convert(p.hash, "full", "full", tile.get.rot.getOrElse(0).toString, "default", "jpg"))
          }).toMap)
          .map(photos => compositions.map(comp => views.html.page(comp, collection, photos).toString))
          .map(svgs => mosaicService.makeAlbumFile(svgs.toList))
          .map(Ok.sendFile(_))
      }
    }
  }
}


class Photos @Inject()(imageService: ImageService, photoDAO: PhotoDAO) extends Controller {
  def get(photoID: Long, region: String, size: String, rotation: String, quality: String, format: String) = Action.async {
    photoDAO.get(photoID) flatMap { photo =>
        imageService.convert(photo.hash, region, size, rotation, quality, format)
      .map(file => Ok(file))
    }
  }
}
