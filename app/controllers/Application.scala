package controllers

import play.api._
import play.api.mvc._
import play.api.libs.json._
import play.api.libs.Files.TemporaryFile
import scalaj.http._
import scala.util.{Try, Success, Failure}      
import java.io._
import org.apache.commons.codec.binary.Hex;
import org.apache.commons.io.FileUtils;
import java.security.MessageDigest

object Application extends Controller {

  def index = Action {
    Ok(views.html.index()).withSession("session" -> SessionManager.generateSession)
  }


  def upload = Action(parse.multipartFormData) { request =>
    implicit val session = request.session.get("session").get
    request.body.file("image") map { image =>
      SessionManager.addImage(image.ref) match {
        case true => Ok("")
        case false => BadRequest("")
      }
    }.getOrElse {
      BadRequest("")
    }
  }

}


object FileManager {
  val baseDir = "storage/images/"
  
  def hashFromContent(data: Array[Byte]): String = {
    var digest = MessageDigest.getInstance("SHA-1")
    digest.update(data)
    Hex.encodeHexString(digest.digest())
  }

  def save(data: Array[Byte]) = {
    val filename = hashFromContent(data)
    val file = new File(baseDir + filename)
    try {
      FileUtils.writeByteArrayToFile(file, data)
      Success(filename)
    } catch {
      case e: IOException => Failure(new Exception)
    }
  }

  def save(newfile: TemporaryFile): Try[String] = {
    val filename = hashFromContent(FileUtils.readFileToByteArray(newfile.file))
    val file = new File(baseDir + filename)
    try {
      newfile.moveTo(file)
      Success(filename)
    } catch {
      case e: IOException => Failure(new Exception)
    }
  }
}


case class DropboxFile(name: String, link: String, icon: String, bytes: Int, thumbnailLink: String)

object DropboxHandler {
  def downloadImages(files: List[DropboxFile])(implicit sess: String) = {
    val filenames = files map { f =>
      FileManager.save(Http(f.link).asBytes.body)
    }
  }
}


case class Session(images: List[String])

object SessionManager {
  val baseDir = "storage/sessions/"

  implicit val sessionFormat = Json.format[Session]

  def generateSession: String = {
    "abcde"
  }

  def addToSession(filename: String)(implicit sessionName: String): Boolean  = addToSession(List(filename))

  def addToSession(filenames: List[String])(implicit sessionName: String): Boolean = { 
    val file = new File(baseDir + sessionName);
    
    val session = try {
      val content = FileUtils.readFileToString(file)
      Json.parse(content).as[Session]
    } catch {
      case e: IOException => Session(Nil)
    }

    val newSession = Session((session.images ::: filenames).distinct)
    try {
      FileUtils.writeStringToFile(file, Json.toJson(newSession).toString)
      true
    } catch {
      case e: IOException => false
    }
  }

  def addImage(newfile: TemporaryFile)(implicit sessionName: String): Boolean = {
    if (newfile.file.length <= 4) {
      false
    } else {
      FileManager.save(newfile) match {
        case Success(filename) =>
          addToSession(filename)
          true
        case Failure(_) => false
      }
    }
  }
}
