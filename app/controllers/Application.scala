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

  def uiWithID(id: Long) = ui
}


class Payment @Inject()(braintree: Braintree, email: Email) extends Controller {
  implicit val orderFormat = Json.format[APIModels.Order]
  implicit val infoFormat = Json.format[APIModels.Info]

  def getToken = Action.async {
    braintree.token.map(token => Ok(token))
  }

  def submitOrder = Action.async(parse.json) { request =>
    val order = (request.body \ "order").as[APIModels.Order].copy(price = 1f)
    val info = (request.body \ "info").as[APIModels.Info]
    braintree.order(order, info) map { trans =>
      email.confirmOrder(order, info) map (println(_))
      Ok
    } recover {
      case ex => BadRequest(ex.getMessage)
    }
  }
}


class Users @Inject()(usersDAO: UsersDAO) extends Controller with CRUDActions[DBModels.User] {
  implicit val format = Json.format[DBModels.User]
  
  def get(id: Long) = getAction(usersDAO.get(id))
  def save = saveAction(usersDAO.insert, usersDAO.update)
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

  def getAlbum(id: Long) = Action.async {
    val album = for {
      collection <- collectionDAO.get(id)
      pages <- compositionDAO.allFromCollection(collection.get.id.get)
      photos <- photoDAO.allFromCollection(collection.get.id.get)
    } yield Json.obj("collection" -> collection, "pages" -> pages, "photos" -> photos)
    album.map(obj => Ok(Json.toJson(obj)))
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


  def generatePage(id: Long, pageID: Long, index: Int) = Action.async(parse.json) { request =>
    shuffleComposition(pageID, request.body.as[List[DBModels.Photo]], index)
      .map(page => Ok(Json.toJson(page)))
  }


  def saveAlbum = Action.async(parse.json) { request =>
    val collection = (request.body \ "collection").as[DBModels.Collection]
    val compositions = (request.body \ "album").as[List[DBModels.Composition]]
    for {
      col <- collectionDAO.update(collection)
      album <- compositionDAO.updateAll(compositions)
    } yield Ok
  }


  def generatePages(id: Long, startindex: Int) = Action.async(parse.json) { request =>
    Future.sequence(
      divideIntoPages(request.body.as[List[DBModels.Photo]])
        .map({case (subset, index) => generateComposition(id, subset.toList, startindex+index)})
      ).map(pages => Ok(Json.toJson(pages)))
  }


  def download(id: Long) = Action.async(parse.json) { request =>
    val collection = (request.body \ "collection").as[DBModels.Collection]
    val compositions = (request.body \ "album").as[List[DBModels.Composition]]
    photoDAO.allFromCollection(id).flatMap(photos =>
        Future.sequence(
          compositions.map(c => mosaicService.renderComposition(c, photos))
        ).map(mosaicService.makePDFFromPages)
        .map(pages => mosaicService.makeAlbumPDF(collection.name, pages))
          .map(value => Ok(Json.toJson(value)))
    )
  }
}
