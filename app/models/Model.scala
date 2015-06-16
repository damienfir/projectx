package models

import play.api.libs.json._
import reactivemongo.bson._
import play.modules.reactivemongo.json.BSONFormats._

abstract class IDModel[T] {
  def _id: Option[BSONObjectID]
  def withID(id: BSONObjectID): T
}

case class User (
  _id: Option[BSONObjectID],
  email: Option[String]
) extends IDModel[User] {
  def withID(id: BSONObjectID) = copy(_id = Some(id))
}

case class Collection (
  _id: Option[BSONObjectID],
  users: List[BSONObjectID],
  photos: List[String]
) extends IDModel[Collection] {
  def withID(id: BSONObjectID) = copy(_id = Some(id))
  def this(users: List[BSONObjectID]) = this(None, users, List())
}

case class Mosaic(
  _id: Option[BSONObjectID],
  filename: Option[String],
  subset: BSONObjectID
) extends IDModel[Mosaic] {
  def withID(id: BSONObjectID) = copy(_id = Some(id))
  def this(subset: Subset) = this(None, None, subset._id.get)
}

case class Subset(
  _id: Option[BSONObjectID],
  photos: List[String]
) extends IDModel[Subset] {
  def withID(id: BSONObjectID) = copy(_id = Some(id))
}


case class Stock(_id: BSONObjectID, mosaic: String, photos: List[String], selected: List[Int])
case class Theme(_id: BSONObjectID, filename: String, theme: String)
case class FeedbackQuestion(_id: BSONObjectID, question: String, choices: List[String])
case class Feedback(_id: Option[BSONObjectID], user_id: BSONObjectID, question_id: BSONObjectID, choice: Int)
case class ContactFeedback(_id: Option[BSONObjectID], user_id: Option[BSONObjectID], email: String, message: Option[String])

case class Email(to: String, from: String)


object JsonFormats {
  implicit val userFormat = Json.format[User]
  implicit val mosaicFormat = Json.format[Mosaic]
  implicit val feebackQuestionFormat = Json.format[FeedbackQuestion]
  implicit val feebackFormat = Json.format[Feedback]
  implicit val contactFeebackFormat = Json.format[ContactFeedback]
  implicit val emailFormat = Json.format[Email]
  implicit val themeFormat = Json.format[Theme]
  implicit val stockFormat = Json.format[Stock]
}
