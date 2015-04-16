package models

import play.api.libs.json._
import reactivemongo.bson._
import play.modules.reactivemongo.json.BSONFormats._


case class User (_id: BSONObjectID, email: Option[String])
case class Mosaic(_id: BSONObjectID, user_id: BSONObjectID, filename: Option[String], thumbnail: Option[String], images: List[String])


object JsonFormats {
  implicit val userFormat = Json.format[User]
  implicit val mosaicFormat = Json.format[Mosaic]
}
