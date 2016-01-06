package bigpiq.shared

case class User(id: Int, email: Option[String] = None)

case class Collection(id: Int, name: Option[String] = None, hash: String)

case class Stored(collection: Collection, pages: List[Composition], photos: List[Photo])

case class Photo( id: Int, collectionID: Int, hash: String, data: Array[Byte])

case class Composition( id: Int, collectionID: Int, index: Int, tiles: List[Tile])

case class Tile(photoID: Int, rot: Int,
  cx1: Float, cx2: Float, cy1: Float, cy2: Float, tx1: Float, tx2: Float, ty1: Float, ty2: Float)
