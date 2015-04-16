package services

import scala.util.{Try, Success, Failure}
import scala.concurrent.Future
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import scala.sys.process._
import play.api.libs.json._
import play.api.Play
import play.api.libs.Files.TemporaryFile
import java.io.File

import models._


object MosaicService extends FileService {
  import JsonFormats._

  val baseDir = Play.current.configuration.getString("px.dir_generated").get

  def addImages(newImages: List[TemporaryFile]): Future[List[String]] = Future {
    newImages
      .filter(_.file.length > 4)
      .map(ImageService.save(_))
      .filter(_.isSuccess)
      .map(_.get)
  }

  def process(mosaic: Mosaic): Future[Try[Mosaic]] = Future {
    val id = mosaic._id.stringify
    val image = id + ".jpg"
    val image_display = id + "_display.jpg"
    val outputLocation = fullPath(image)
    val binary = Play.current.configuration.getString("px.binary").get
    val paths = mosaic.images.map(ImageService.fullPath(_))
    val cmd = binary +: "-platform" +: "offscreen" +: paths :+ outputLocation
    cmd.! match {
      case 0 => Success(mosaic.copy(filename=Some(image), thumbnail=Some(image_display)))
      case _ => Failure(new Exception)
    }
  }
}
