package controllers

import scala.util.{Try, Success, Failure}
import scala.sys.process._
import play.api.libs.json._


case class Mosaic(mosaic: String)

object MosaicModel extends FileModel {
  val baseDir = "public/mosaics"
  implicit val jsonFormat = Json.format[Mosaic]

  def process(implicit session: String): Try[JsValue] = {
    val filename = session + ".jpg"
    val outputLocation = fullPath(filename)
    // val cmd = "montage" +: SessionModel.getImagePaths :+ "-geometry" :+ "120x90+2+2" :+ outputLocation
    val cmd = "../mosaic/PhotoSummary" +: "-platform" +: "offscreen" +: SessionModel.getImagePaths :+ outputLocation
    cmd.! match {
      case 0 => Success(Json.toJson(Mosaic(session)))
      case _ => Failure(new Exception)
    }
  }
}
