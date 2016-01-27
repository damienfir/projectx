package bigpiq.shared

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


case class Stored(
  collection: Collection,
  pages: List[Composition],
  photos: List[Photo]
)

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
