package models

import scalaj.http._
import play.api.libs.json._


case class DropboxFile(name: String, link: String, icon: String, bytes: Int, thumbnailLink: String)

object Dropbox {
  implicit val dropboxForm = Json.format[DropboxFile]

  def download(files: JsValue): List[String] = {
    files.as[List[DropboxFile]] map { f =>
      ImageModel.save(Http(f.link).asBytes.body)
    } filter(_.isSuccess) map (_.get)
  }
}
