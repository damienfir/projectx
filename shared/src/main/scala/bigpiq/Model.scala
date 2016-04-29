package bigpiq.shared


case class User(id: Long, email: String, albums: List[Album])

case class Album(id: Long, hash: String, title: String, pages: List[Page]) {
  def filter = this.copy(pages =
    pages.filter(_.tiles.nonEmpty)
      .sortBy(_.index))

  def adjustIndex = this.copy(pages =
    pages.zipWithIndex.map({ case (page, i) => page.copy(index = i) }))

  def getAllPhotos: List[Photo] =
    pages.flatMap(p => p.tiles.map(t => t.photo))

  def density: Double = getAllPhotos.length.toDouble / pages.length.toDouble

  def getPhoto(page: Int, tile: Int): Option[Photo] = for {
    page <- pages.lift(page)
    tile <- page.tiles.lift(tile)
  } yield tile.photo

  // increment page numbers
  def shiftPagesAfter(page: Int): Album =
    this.copy(pages =
      pages.take(page + 1) ++
        pages.drop(page + 1).map(p => p.copy(index = p.index + 1)))
}

case class Page(id: Long, index: Int, tiles: List[Tile]) {
  def getPhotos: List[Photo] = tiles.map(_.photo)

  // keep rotations
  def update(newTiles: List[Tile]): Page =
    this.copy(tiles = newTiles.map(newTile =>
      tiles.find(t => t.photo.id == newTile.photo.id)
        .map(t => newTile.copy(rot = t.rot)).getOrElse(newTile)
    ))
}

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