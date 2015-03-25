package controllers

import play.api._
import play.api.mvc._
import play.api.libs.json._
import play.api.libs.Files.TemporaryFile
import play.api.mvc.MultipartFormData._
import scalaj.http._
import scala.util.{Try, Success, Failure}      
import scala.concurrent._
import scala.concurrent.ExecutionContext.Implicits.global
import scala.sys.process._
import java.io._
import org.apache.commons.codec.binary.Hex;
import org.apache.commons.io.FileUtils;
import java.security.MessageDigest


object Application extends Controller {
  implicit val dropboxForm = Json.format[DropboxFile]
  
  object ActionWithSession extends ActionBuilder[Request] {
    def invokeBlock[A](request: Request[A], block: (Request[A]) => Future[Result]) = {
      implicit val session = request.session.get("session").getOrElse(SessionManager.generateSession)
      block(request) map {
        _.withSession("session" -> session)
      }
    }
  }

  def index = ActionWithSession { request =>
    implicit val session = request.session.get("session").getOrElse(SessionManager.generateSession)
    Ok(views.html.index()).withSession("session" -> session)
  }


  def upload = ActionWithSession(parse.multipartFormData) { request =>
    request.session.get("session").map { implicit session =>
      request.body.file("image").map { image: FilePart[TemporaryFile] =>
        SessionManager.addImage(image.ref) match {
          case true => Ok("")
          case false => BadRequest
        }
      }.getOrElse(BadRequest)
    }.getOrElse(BadRequest)
  }

  
  def dropbox = ActionWithSession(parse.json[List[DropboxFile]]) { dropboxFiles =>
    Ok("")
  }


  def process = ActionWithSession { request =>
    request.session.get("session").map { implicit session =>
      val outputLocation = MosaicManager.fullPath(session)
      val cmd = "montage" +: SessionManager.getImagePaths :+ "-geometry" :+ "120x90+2+2" :+ outputLocation
      cmd.! match {
        case 0 => Ok(s"""{ "mosaic": "$session"}""")
        case _ => InternalServerError
      }
    }.getOrElse(BadRequest)
  }

  def reset = ActionWithSession { request =>
    request.session.get("session").map { implicit session =>
      SessionManager.reset
      Ok("")
    }.getOrElse(BadRequest)
  }
}


object ImageManager {
  val baseDir = "storage/images"
  
  def hashFromContent(data: Array[Byte]): String = {
    var digest = MessageDigest.getInstance("SHA-1")
    digest.update(data)
    Hex.encodeHexString(digest.digest())
  }

  def save(data: Array[Byte]) = {
    val filename = hashFromContent(data)
    val file = new File(s"$baseDir/$filename")
    try {
      FileUtils.writeByteArrayToFile(file, data)
      Success(filename)
    } catch {
      case e: IOException => Failure(new Exception)
    }
  }

  def save(newfile: TemporaryFile): Try[String] = {
    val filename = hashFromContent(FileUtils.readFileToByteArray(newfile.file))
    val file = new File(s"$baseDir/$filename")
    try {
      newfile.moveTo(file)
      Success(filename)
    } catch {
      case e: IOException => Failure(e)
    }
  }

  def fullPath(hash: String): String = s"$baseDir/$hash"
  def getImage(hash: String): File = new File(fullPath(hash))
}


case class DropboxFile(name: String, link: String, icon: String, bytes: Int, thumbnailLink: String)

object DropboxHandler {
  def downloadImages(files: List[DropboxFile])(implicit sess: String) = {
    val filenames = files map { f =>
      ImageManager.save(Http(f.link).asBytes.body)
    }
  }
}


object MosaicManager {
  val baseDir = "public/mosaics"

  def fullPath(hash: String): String = s"$baseDir/$hash"
  def getMosaic(hash: String): File = new File(fullPath(hash))
}


case class Session(images: List[String])

object SessionManager {
  val baseDir = "storage/sessions"

  implicit val sessionFormat = Json.format[Session]

  def generateSession: String = {
    "abcde"
  }

  def getFile(implicit sess: String): File = new File(s"$baseDir/$sess");

  def addToSession(filename: String)(implicit sessionName: String): Boolean  = addToSession(List(filename))

  def addToSession(filenames: List[String])(implicit sessionName: String): Boolean = { 
    val session = getSession;

    val newSession = Session((session.images ::: filenames).distinct)
    writeSession(newSession)
  }

  def writeSession(newSession: Session)(implicit sess: String) = {
    try {
      FileUtils.writeStringToFile(getFile, Json.toJson(newSession).toString)
      true
    } catch {
      case e: IOException => false
    }
  }

  def addImage(newfile: TemporaryFile)(implicit sessionName: String): Boolean = {
    if (newfile.file.length <= 4) {
      false
    } else {
      ImageManager.save(newfile) match {
        case Success(filename) =>
          addToSession(filename)
          true
        case Failure(e) =>
          println(e)
          false
      }
    }
  }

  def getImagePaths(implicit sess: String): Seq[String] = {
    getSession.images.map(ImageManager.fullPath(_))
  }

  def getSession(implicit sess: String ): Session = {
    try {
      val content = FileUtils.readFileToString(getFile)
      Json.parse(content).as[Session]
    } catch {
      case e: IOException => Session(Nil)
    }
  }

  def moveFile(implicit sess: String): String = {
    var session = getSession;
    var src = ImageManager.getImage(session.images.last)
    var dst = MosaicManager.getMosaic(session.images.last)
    FileUtils.copyFile(src, dst);
    dst.getName()
  }

  def reset(implicit sess: String) = {
    writeSession(Session(Nil))
  }
}
