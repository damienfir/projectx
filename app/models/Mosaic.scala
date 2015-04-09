package models;

import scala.util.{Try, Success, Failure}
import scala.sys.process._
import play.api.libs.json._
import play.api.Play


case class Mosaic(id: String, mosaic: String, display: String)

object MosaicModel extends FileModel {
  val baseDir = Play.current.configuration.getString("px.dir_generated").get
  implicit val jsonFormat = Json.format[Mosaic]

  def process(implicit collection: Collection): Try[JsValue] = {
    val id = collection.id.get.toString
    println(id)
    val image = id + ".jpg"
    val image_display = image
    val outputLocation = fullPath(image)
    val binary = Play.current.configuration.getString("px.binary").get
    val paths = CollectionModel.getImagePaths
    val cmd = binary +: "-platform" +: "offscreen" +: paths :+ outputLocation
    println(cmd)
    cmd.! match {
      case 0 => Success(Json.toJson(Mosaic(id, image, image_display)))
      case _ => Failure(new Exception)
    }
  }
}
