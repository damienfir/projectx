package models

import play.api.libs.json._
import reactivemongo.bson._
import play.modules.reactivemongo.json.BSONFormats._


case class User (_id: BSONObjectID, email: Option[String])
case class Mosaic(_id: BSONObjectID, user_id: BSONObjectID, filename: Option[String], thumbnail: Option[String], images: List[String])

case class Theme(_id: BSONObjectID, filename: String, theme: String)
case class FeedbackQuestion(_id: BSONObjectID, question: String, choices: List[String])
case class Feedback(_id: Option[BSONObjectID], user_id: Option[BSONObjectID], question_id: BSONObjectID, choice: Int)
case class TextFeedback(_id: Option[BSONObjectID], user_id: Option[BSONObjectID], text: String)
case class ContactFeedback(_id: Option[BSONObjectID], user_id: Option[BSONObjectID], email: String, message: Option[String])

case class Email(to: String, from: String)


object JsonFormats {
  implicit val userFormat = Json.format[User]
  implicit val mosaicFormat = Json.format[Mosaic]
  implicit val feebackQuestionFormat = Json.format[FeedbackQuestion]
  implicit val feebackFormat = Json.format[Feedback]
  implicit val textFeebackFormat = Json.format[TextFeedback]
  implicit val contactFeebackFormat = Json.format[ContactFeedback]
  implicit val emailFormat = Json.format[Email]
  implicit val themeFormat = Json.format[Theme]
}
