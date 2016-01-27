package models

import play.api.libs.json._


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
