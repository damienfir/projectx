package controllers

import javax.inject.Inject

import play.api._
import play.api.mvc._
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import scala.concurrent.Future
import play.api.i18n._

import bigpiq.server.services._
import bigpiq.server.db
import bigpiq.shared._

import upickle.default._
import upickle.Js
import upickle.json


object Router extends autowire.Server[Js.Value, Reader, Writer] {
  override def read[R: Reader](s: Js.Value) = readJs[R](s)

  override def write[R: Writer](r: R) = writeJs(r)
}


class Application @Inject()(val messagesApi: MessagesApi, serverApi: ServerApi) extends Controller with I18nSupport {

  def makeCookie(id: Long) = Cookie("bigpiquser", id.toString, maxAge = Some(315360000), httpOnly = false)

  def index(lang: Option[String]) = Action { implicit request =>
    val id = Play.current.configuration.getString("px.demoID").get
    Ok(views.html.index(id))
  }

  def ui = Action { implicit request =>
    val id = Play.current.configuration.getString("px.demoID").get
    val url = Play.current.configuration.getString("px.paypal-url").get
    Ok(views.html.interactive(id, url))
  }

  def uiWithHash(hash: String) = ui

  def autowireApi(path: String) = Action.async(parse.tolerantText) {
    implicit request =>

      Router.route[Api](serverApi) {
        autowire.Core.Request(path.split("/"), json.read(request.body).asInstanceOf[Js.Obj].value.toMap)
      }
        .map(s => (s, json.write(s)))
        .map {
          case (user: User, p: String) => Ok(p).withCookies(makeCookie(user.id))
          case (_, p: String) => Ok(p)
        }
    // .recover({
    //   case ex => BadRequest
    // })
  }

  def pdf(hash: String) = Action.async {
    serverApi.pdf(hash).map(a =>
      Ok.sendFile(a)
        .as("application/pdf")
        .withHeaders(
          CONTENT_DISPOSITION -> "Inline"
        ))
  }
}


class Photos @Inject()(imageService: ImageService, photoDAO: db.PhotoDAO) extends Controller {

  def addToCollection(id: Long) = Action.async(parse.maxLength(50 * 1024 * 1024 * 1000 * 1000, parser = parse.multipartFormData)) { request =>
    request.body match {
      case Left(_) => Future(EntityTooLarge)
      case Right(body) =>
        val (hash, data) = imageService.save(body.files.head.ref)
        photoDAO.addToCollection(id, hash, data)
          .map((p: Photo) => Ok(write(p)))
    }
  }

  def get(photoID: Long, region: String, size: String, rotation: String, quality: String, format: String) = Action.async {
    photoDAO.get(photoID) flatMap { maybePhoto =>
      maybePhoto.map { photo =>
        imageService.convert(photo.data, region, size, rotation, quality, format)
          .map(file => Ok(file).withHeaders(
            CACHE_CONTROL -> "max-age=3600"
          ))
      } getOrElse Future(NotFound)
    }
  }
}
