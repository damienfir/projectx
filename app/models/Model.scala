package models

import play.api.libs.json._


object DB {
  trait HasID{
    def id: Option[Long]
  }

  case class User (
    id: Option[Long],
    email: Option[String]
  ) extends HasID

  case class Collection (
    id: Option[Long],
    name: Option[String]
  )

  case class Photo (
    id: Option[Long],
    collectionID: Long,
    hash: String
  )

  case class Composition (
    id: Option[Long],
    collectionID: Long,
    tiles: List[Tile]
  )

  case class Tile(
    photoID: Long,
    tileindex: Int,
    cx1: Float,
    cx2: Float,
    cy1: Float,
    cy2: Float,
    tx1: Float,
    tx2: Float,
    ty1: Float,
    ty2: Float
  )

  implicit val tileformat = Json.format[Tile]
}

object Backend {

  case class Cluster(
    gists: List[String],
    sorted: List[Int]
  )

  case class Tile(
    tileindex: Int,
    imgindex: Int,
    cx1: Float,
    cx2: Float,
    cy1: Float,
    cy2: Float,
    tx1: Float,
    tx2: Float,
    ty1: Float,
    ty2: Float
  )
}

// case class Subset(
//   _id: Option[BSONObjectID],
//   photos: List[String]
// ) extends IDModel[Subset] {
//   def withID(id: BSONObjectID) = copy(_id = Some(id))
// }


// case class Stock(_id: BSONObjectID, mosaic: String, photos: List[String], selected: List[Int])
// case class Theme(_id: BSONObjectID, filename: String, theme: String)
// case class FeedbackQuestion(_id: BSONObjectID, question: String, choices: List[String])
// case class Feedback(_id: Option[BSONObjectID], user_id: BSONObjectID, question_id: BSONObjectID, choice: Int)
// case class ContactFeedback(_id: Option[BSONObjectID], user_id: Option[BSONObjectID], email: String, message: Option[String])

// case class Email(to: String, from: String)


// object JsonFormats {
//   implicit val feebackQuestionFormat = Json.format[FeedbackQuestion]
//   implicit val feebackFormat = Json.format[Feedback]
//   implicit val contactFeebackFormat = Json.format[ContactFeedback]
//   implicit val emailFormat = Json.format[Email]
//   implicit val themeFormat = Json.format[Theme]
//   implicit val stockFormat = Json.format[Stock]
//   implicit val tileformat = Json.format[Tile]
// }
