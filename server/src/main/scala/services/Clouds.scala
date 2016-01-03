package services

import scalaj.http._
import scala.concurrent.Future
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import play.api.libs.json._


case class DropboxFile(name: String, link: String, icon: String, bytes: Int, thumbnailLink: String)

object Dropbox {
  implicit val dropboxForm = Json.format[DropboxFile]

  // def download(files: JsValue): Future[List[String]] = Future {
  //   files.as[List[DropboxFile]] map { f =>
  //     ImageService.save(Http(f.link).asBytes.body)
  //   } filter(_.isSuccess) map (_.get)
  // }
}
