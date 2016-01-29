package bigpiq.shared


case class User(id: Long, email: String, albums: List[Album])

case class Album(id: Long, hash: String, title: String, pages: List[Page])

case class Page(id: Long, index: Int, tiles: List[Tile])

case class Tile(photo: Photo, rot: Int, 
  cx1: Float,
  cx2: Float,
  cy1: Float,
  cy2: Float,
  tx1: Float,
  tx2: Float,
  ty1: Float,
  ty2: Float
)

case class Photo(id: Long, hash: String)
