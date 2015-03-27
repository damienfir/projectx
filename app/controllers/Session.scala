package controllers;


import play.api.libs.Files.TemporaryFile
import scala.util.{Try, Success, Failure}
import play.api.libs.json._

case class Session(images: List[String])

object SessionModel extends JsonModel[Session] {
  type T = Session

  val baseDir = "storage/sessions"
  implicit val jsonFormat = Json.format[Session]

  def default = Session(Nil)

  def addToSession(filenames: List[String])(implicit session: String): Boolean = { 
    write(Session((get.images ::: filenames).distinct))
  }

  def addImages(newImages: List[TemporaryFile])(implicit session: String): Boolean = {
    val hashList = newImages.map{ newFile: TemporaryFile =>
      if (newFile.file.length <= 4) {
        Failure(new Exception)
      } else {
        ImageModel.save(newFile)
      }
    }.filter(_.isSuccess)

  addToSession(hashList.filter(_.isSuccess).map(_.get)) || hashList.length > 0
  }

  def getImagePaths(implicit session: String): Seq[String] = {
    get.images.map(ImageModel.fullPath(_))
  }
}
