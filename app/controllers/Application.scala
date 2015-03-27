package controllers

import play.api._
import play.api.mvc._
import play.api.libs.json._
import play.api.mvc.MultipartFormData._
import scalaj.http._
import scala.util.{Try, Success, Failure, Random}
import scala.concurrent._
import scala.concurrent.ExecutionContext.Implicits.global
import java.util.UUID;
import java.io._
import org.apache.commons.io.FileUtils;


object Application extends Controller {

  def index = Action { request =>
    Ok(views.html.index()).withSession("session" -> SessionModel.generateNew)
  }

  def upload = Action(parse.multipartFormData) { request =>
    request.session.get("session").map { implicit session =>
      SessionModel.addImages(request.body.files.map(_.ref).toList) match {
        case true => Ok("")
        case false => InternalServerError
      }
    }.getOrElse(BadRequest)
  }

  def process = Action { request =>
    request.session.get("session").map { implicit session =>
      MosaicModel.process match {
        case Success(json) => Ok(json.toString)
        case Failure(_) => InternalServerError
      }
    }.getOrElse(BadRequest)
  }
}


abstract class FileModel {
  val baseDir: String
  def fullPath(name: String): String = s"$baseDir/$name"
  def getFile(name: String): File = new File(fullPath(name))
}

abstract class JsonModel[T] extends FileModel {
  type T;
  def default: T;
  implicit val jsonFormat: Format[T]

  // def generateNew: String = (new Random).alphanumeric.take(8)
  def generateNew: String = UUID.randomUUID().toString()

  def get(implicit name: String): T = {
    try {
      val content = FileUtils.readFileToString(getFile(name))
      Json.parse(content).as[T]
    } catch {
      case e: IOException => default
    }
  }

  def write(item: T)(implicit name: String): Boolean = {
    try {
      FileUtils.writeStringToFile(getFile(name), Json.toJson(item).toString)
      true
    } catch {
      case e: IOException => false
    }
  }
}
