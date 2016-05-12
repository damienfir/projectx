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

  def withBlankPages = this.copy(pages =
    if (bookModel.blankBackside) pages.head +: Page(-1, -1, Nil) +: pages.tail
    else pages)
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

case class BlankPage() extends PageElement

case class BacksidePage() extends PageElement

case class CoverPage() extends PageElement


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


case class PageSize(w: Double, h: Double, bleed: Double, fold: Double) {
  def ratio: Double = w / h

  def extra = 2 * bleed + 2 * fold

  def fullWidth = w + extra

  def fullHeight = h + extra
}

abstract case class BookModel(minPagesTotal: Int,
                              cover: PageSize,
                              pages: PageSize,
                              mustBeEven: Boolean,
                              spine: (Double, Double),
                              pdfVersion: String,
                              minDPI: Int,
                              coverSeparate: Boolean,
                              blankBackside: Boolean
                    ) {
  def fullCoverWidth = 2 * cover.fullWidth + spine._1
  def offset(index: Int)
}


object BookModels {

  sealed trait PageType

  case class A4Landscape() extends PageType

  val models: Map[Int, BookModel] = Map(
    0 -> BookFactory(A4Landscape())
  )

  val default = 0
  val defaultModel = models.get(default).get

  case class BookFactory(coverSize: PageSize, pagesSize: PageSize) extends BookModel(
    minDPI = 200,
    cover = coverSize,
    pages = pagesSize,
    minPagesTotal = 16,
    pdfVersion = "PDF 1.4",
    spine = (6, 0),
    mustBeEven = false,
    coverSeparate = true,
    blankBackside = false
  ) {
    def offset(index: Int): Double =
      if (index == 0) cover.fullWidth + spine._1
      else pages.bleed
  }

  object BookFactory {
    def apply(size: PageType): BookFactory = {
      val (cover, pages) = size match {
        case _: A4Landscape => (PageSize(297.0, 210.0, 2.5, 15), PageSize(297.0, 210.0, 3, 0))
      }
      BookFactory(cover, pages)
    }
  }

  def indexOf(model: BookModel): Int =
    models.find { case (i, m) => m == model }.map(_._1).getOrElse(default)
}