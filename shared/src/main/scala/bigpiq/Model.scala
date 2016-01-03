package bigpiq.shared


case class User(id: Option[Long], email: Option[String])

case class Collection(id: Option[Long], name: Option[String], hash: String)

case class Album(pages: List[Composition])

case class Photo( id: Option[Long], collectionID: Long, hash: String, data: Array[Byte])

case class Composition( id: Option[Long], collectionID: Long, index: Int, tiles: List[Tile])

case class Tile(photoID: Long, rot: Option[Int],
  cx1: Float, cx2: Float, cy1: Float, cy2: Float, tx1: Float, tx2: Float, ty1: Float, ty2: Float)