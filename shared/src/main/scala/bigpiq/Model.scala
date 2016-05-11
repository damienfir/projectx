package bigpiq.shared


case class User(id: Long,
                email: String,
                albums: List[Album])

case class Album(id: Long,
                 hash: String,
                 title: String,
                 pages: List[Page],
                 bookModel: BookModel) {
  def sort = this.copy(pages = pages.sortBy(_.index))
}

trait PageElement

case class Page(id: Long,
                index: Int,
                tiles: List[Tile])
  extends PageElement {
  def getPhotos: List[Photo] = tiles.map(_.photo)

  // keep rotations
  def update(newTiles: List[Tile]): Page =
    this.copy(tiles = newTiles.map(newTile =>
      tiles.find(t => t.photo.id == newTile.photo.id)
        .map(t => newTile.copy(rot = t.rot)).getOrElse(newTile)
    ))

  def photosExcept(id: Long): List[Photo] =
    if (index == 0) getPhotos
    else getPhotos.filter(_.id != id)
}

case class Tile(photo: Photo,
                rot: Int,
                cx1: Float,
                cx2: Float,
                cy1: Float,
                cy2: Float,
                tx1: Float,
                tx2: Float,
                ty1: Float,
                ty2: Float)

case class Photo(id: Long,
                 hash: String)


case class PageSize(w: Double, h: Double) {
  def ratio: Double = w / h
}

case class BookModel(minPagesTotal: Int,
                     cover: PageSize,
                     pages: PageSize,
                     mustBeEven: Boolean,
                     bleed: Double,
                     spine: (Double, Double),
                     pdfVersion: String,
                     minDPI: Int
                    ) {
  def bleedP(size: PageSize): (Double, Double) = (bleed/size.w, bleed/size.h)
}


object BookModels {

  sealed trait PageType

  case class A4Landscape() extends PageType

  val models: Map[Int, BookModel] = Map(
    0 -> bookfactory(A4Landscape())
  )

  val default = 0
  val defaultModel = models.get(default).get

  def bookfactory(size: PageType): BookModel = {
    val (cover, pages) = size match {
      case _: A4Landscape => (PageSize(297.0, 210.0), PageSize(297.0, 210.0))
    }

    BookModel(
      minDPI = 200,
      bleed = 3,
      cover = cover,
      pages = pages,
      minPagesTotal = 16,
      pdfVersion = "PDF 1.6",
      spine = (0, 0),
      mustBeEven = false
    )
  }

  def indexOf(model: BookModel): Int =
    models.find { case (i, m) => m == model }.map(_._1).getOrElse(0)
}