package controllers

import scala.util.{Try, Success, Failure}
import scala.sys.process._
import play.api.libs.json._
import play.api.Play


case class Mosaic(mosaic: String, display: String)

object MosaicModel extends FileModel {
  val baseDir = Play.current.configuration.getString("px.dir_generated").get
  implicit val jsonFormat = Json.format[Mosaic]

  def process(implicit session: String): Try[JsValue] = {
    val filename = session + ".jpg"
    val image = session
    val image_display = session + "_display"
    val outputLocation = fullPath(filename)
    val binary = Play.current.configuration.getString("px.binary").get
    val cmd = binary +: "-platform" +: "offscreen" +: SessionModel.getImagePaths :+ outputLocation
    cmd.! match {
      case 0 => Success(Json.toJson(Mosaic(image, image_display)))
      case _ => Failure(new Exception)
    }
  }
}
