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

import bigpiq.shared._

// import play.api.libs.json._
import upickle.default._
import upickle.Js
import upickle.json


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
  // implicit val orderFormat = Json.format[APIModels.Order]
  // implicit val infoFormat = Json.format[APIModels.Info]

  def getToken = Action.async {
    braintree.token.map(token => Ok(token))
  }

  def submitOrder = Action.async(parse.tolerantText) { request =>
    val obj = json.read(request.body)
    val order = readJs[Order](obj("order"))
    val info = readJs[Info](obj("info"))
    braintree.order(order, info) map { trans =>
      email.confirmOrder(order, info) map (println(_))
      Ok(write(Map("status" -> 1)))
    } recover {
      case ex => BadRequest(ex.getMessage)
    }
  }
}


class Users @Inject()(usersDAO: UsersDAO) extends Controller {

  def get(id: Long) = Action.async {
    usersDAO.get(id) map {
      case Some(item) => Ok(write(item))
      case None => NotFound
    }
  }

  def save = Action.async(parse.tolerantText) { request =>
    val item = read[User](request.body)
    (item.id match {
      case Some(id) => usersDAO.update(item)
      case None => usersDAO.insert(item) map (Success(_))
    }) map {
      case Success(newItem: User) => Ok(write(newItem))
      case Success(_) => Ok(write(item))
      case Failure(_) => BadRequest
    }
  }
}


class Collections @Inject()(usersDAO: UsersDAO, compositionDAO: CompositionDAO, collectionDAO: CollectionDAO, photoDAO: PhotoDAO, imageService: ImageService, mosaicService: MosaicService, emailService: Email) extends Controller {

  def fromUser(id: Long) = Action.async {
    collectionDAO.fromUser(id) map (items => Ok(write(items)))
  }


  def withUser(id: Long) = Action.async {
    collectionDAO.withUser(id) map { item =>
      Ok(write(item))
    } recover {
      case _ => NotFound
    }
  }

  def getAlbum(id: Long) = Action.async {
    val album = for {
      collection <- collectionDAO.get(id)
      pages <- compositionDAO.allFromCollection(collection.get.id.get)
      photos <- photoDAO.allFromCollection(collection.get.id.get)
    } yield Stored(collection.get, pages.toList, photos.toList)
    album.map(obj => Ok(write(obj)))
  }

  def getAlbumFromHash(userID: Long, hash: String) = Action.async {
    val album = for {
      collection <- collectionDAO.getByHash(userID, hash)
      pages <- compositionDAO.allFromCollection(collection.id.get)
      photos <- photoDAO.allFromCollection(collection.id.get)
    } yield Stored(collection, pages.toList, photos.toList.map(_.copy(data=Array())))
    album.map(obj => Ok(write(obj)))
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
        .map(photo => Ok(write(photo.copy(data=Array()))))
    }
  }


  def divideIntoPages(photos: List[Photo]): List[(List[Photo],Int)] =
    photos.grouped(3).toList.zipWithIndex


  def generateComposition(id: Long, photos: List[Photo], index: Int): Future[Composition] = {
    for {
      comp <- compositionDAO.addWithCollection(id)
      tiles <- mosaicService.generateComposition(comp.id.get, photos)
      c <- compositionDAO.update(comp.copy(tiles = tiles, index = index))
    } yield c
  }


  def shuffleComposition(id: Long, photos: List[Photo]): Future[Composition] = {
    for {
      comp <- compositionDAO.get(id)
      tiles <- mosaicService.generateComposition(id, photos)
    } yield comp.copy(tiles = tiles)
  }


  def shufflePage(id: Long, pageID: Long) = Action.async(parse.tolerantText) { request =>
    shuffleComposition(pageID, read[List[Photo]](request.body))
      .map(page => Ok(write(page)))
  }


  def generatePage(id: Long, index: Int) = Action.async(parse.tolerantText) { request =>
    // val photos = request.body.as[List[Photo]]
    val photos = read[List[Photo]](request.body)
    println(photos)
      // val pagesWithCover = if (index == 0) {
      //   (List(photos(Random.nextInt(photos.size))), 0) :: pages.map({case (p,i) => (p,i+1)})
      // } else { pages }
      // Future.sequence {
      //   pagesWithCover.map({case (subset, index) => generateComposition(id, subset, startindex+index)})
      // }.map(pages => Ok(Json.toJson(pages)))
    // }

    generateComposition(id, photos, index) map (page => Ok(write(page)))
  }


  def saveAlbum = Action.async(parse.tolerantText) { request =>
    val obj = json.read(request.body)
    val collection = readJs[Collection](obj("collection"))
    val compositions = readJs[List[Composition]](obj("album"))
    for {
      col <- collectionDAO.update(collection)
      album <- compositionDAO.updateAll(compositions)
      res <- compositionDAO.removeUnused(collection, compositions)
    } yield Ok(write(collection))
  }


  def emailLink(id: Long, hash: String) = Action.async(parse.tolerantText) { request =>
    // val email = (request.body \ "email").as[String]
    val email = json.read(request.body)("email").asInstanceOf[String]
    emailService.sendLink(email, hash) map (Ok(_))
  }


  def download(id: Long) = Action.async(parse.tolerantText) { request =>
    val obj = json.read(request.body)
    val collection = readJs[Collection](obj("collection"))
    val compositions = readJs[List[Composition]](obj("album"))
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
