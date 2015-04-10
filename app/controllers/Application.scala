package controllers

import play.api._
import play.api.mvc._
// import play.api.mvc.MultipartFormData._
import scala.util.{Try, Success, Failure, Random}

import models._


object Application extends Controller {

  def index(filename: String) = Action { implicit request =>
    implicit val user = UserModel.getOrCreateFromSession(request.session.get("user"))
    Ok(views.html.index(filename)).addingToSession(
      "user" -> user.id.get.toString
    )
  }

  def reset = Action { implicit request =>
    UserModel.getFromSession(request.session.get("user")).map { implicit user =>
      Ok.addingToSession(
        "collection" -> CollectionModel.generateNew.id.get.toString
      )
    }.getOrElse(BadRequest)
  }

  def upload = Action(parse.multipartFormData) { request =>
    CollectionModel.getFromSession(request.session.get("collection")) map { implicit collection =>
      CollectionModel.addImages(request.body.files.map(_.ref).toList)
      Ok
    } getOrElse(BadRequest)
  }

  def process = Action { request =>
    CollectionModel.getFromSession(request.session.get("collection")).map { implicit collection =>
      MosaicModel.process match {
        case Success(json) => Ok(json.toString)
        case Failure(e) =>
          println(e)
          InternalServerError
      }
    }.getOrElse(BadRequest)
  }

  def dropbox = Action(parse.json) { implicit request =>
    CollectionModel.getFromSession(request.session.get("collection")) map { implicit collection =>
      val files = Dropbox.download(request.body)
      println(files)
      CollectionModel.addToCollection(files);
      Ok
    } getOrElse(BadRequest)
  }

  def download = Action(parse.urlFormEncoded) { implicit request =>
    UserModel.getFromSession(request.session.get("user")) flatMap { implicit user =>
      request.body.get("email") map { email =>
        UserModel.addEmail(email.head)
        Ok
      }
    } getOrElse(BadRequest)
  }
}
