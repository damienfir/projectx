package models

import play.api.libs.json._


object DBModels {
  trait HasID{
    def id: Option[Long]
  }

  case class User (
    id: Option[Long],
    email: Option[String]
  ) extends HasID

  case class Collection (
    id: Option[Long],
    name: Option[String],
    hash: String
  )

  case class Photo (
    id: Option[Long],
    collectionID: Long,
    hash: String,
    data: Array[Byte]
  )

  case class Composition (
    id: Option[Long],
    collectionID: Long,
    index: Int,
    // photos: List[String],
    tiles: List[Tile]
  )

  case class Tile(
    photoID: Long,
    rot: Option[Int],
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


object APIModels {
  case class Info(
    firstName: String,
    lastName: String,
    email: String,
    address: String,
    zip: String,
    city: String,
    country: String
  )

  case class Order(
    userID: Long,
    collectionID: Long,
    nonce: String,
    qty: Int
  )
}

object MosaicModels {
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

  case class Tile2(
    imfile: String,
    rot: Int,
    cx1: Float,
    cx2: Float,
    cy1: Float,
    cy2: Float,
    tx1: Float,
    tx2: Float,
    ty1: Float,
    ty2: Float
  )

  implicit val tile2format = Json.format[Tile2]
  implicit val tileformat = Json.format[Tile]
  implicit val clusterformat = Json.format[Cluster]
}
