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
    else if (bookModel.mustBeEven && (pages.tail.length % 2 == 1)) pages :+ Page(-1, -1, Nil)
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


sealed trait DimensionModel {
  val w: Double
  val h: Double
  val bleed: Double

  def ratio: Double = w / h

  def size: (Double, Double) = (w, h)
}

case class PageModel(w: Double, h: Double, bleed: Double) extends DimensionModel

case class CoverModel(w: Double, h: Double, bleed: Double, spine: Double) extends DimensionModel {
  override def ratio = size._1 / h

  override def size = ((w - spine) / 2, h)
}


sealed trait BookModel {
  val minPagesTotal: Int
  val cover: CoverModel
  val page: PageModel
  val mustBeEven: Boolean
  val pdfVersion: String
  val minDPI: Int
  val blankBackside: Boolean
  val coverSize: (Double, Double)

  def coverOffset: (Double, Double)

  def pageSize: (Double, Double)

  def pageOffset(right: Boolean): (Double, Double)

//  def adjustFoldWidth(fold: Double, width: Double): BookModel
  def adjustSpine(spine: Double): BookModel
}


case class BookfactoryModel(minPagesTotal: Int = 16,
                                     mustBeEven: Boolean = false,
                                     pdfVersion: String = "PDF 1.4",
                                     minDPI: Int = 200,
                                     blankBackside: Boolean = false,
                                     cover: CoverModel,
                                     page: PageModel,
                                     coverFold: Double,
                                     coverSize: (Double, Double))
  extends BookModel {

  def coverOffset = (coverSize._1 - coverFold - cover.w, coverSize._2 - coverFold - cover.bleed - cover.h)

  def pageOffset(right: Boolean = false) = (page.bleed, page.bleed)

  def pageSize = (page.w + 2 * page.bleed, page.h + 2 * page.bleed)

//  def adjustFoldWidth(fold: Double, width: Double): BookModel = this.copy(coverSize = (width, coverSize._2), coverFold = fold)

  def adjustSpine(spine: Double): BookModel = this.copy(cover = cover.copy(spine = spine))
}


case class BlurbModel(
                       minPagesTotal: Int = 10,
                       mustBeEven: Boolean = true,
                       minDPI: Int = 200,
                       pdfVersion: String = "PDF 1.4",
                       blankBackside: Boolean = false,
                       cover: CoverModel,
                       page: PageModel,
                       coverSize: (Double, Double)
                     )
  extends BookModel {
  def coverOffset: (Double, Double) = (cover.bleed + cover.size._1 + cover.spine, cover.bleed)

  def pageSize: (Double, Double) = (page.w + page.bleed, page.h + 2 * page.bleed)

  def pageOffset(right: Boolean): (Double, Double) = (if (right) 0 else page.bleed, page.bleed)

//  def adjustFoldWidth(fold: Double, width: Double): BookModel = this.copy(coverSize = (width, coverSize._2))
  def adjustSpine(spine: Double): BookModel = this.copy(cover = cover.copy(spine = spine))

}


object BookModels {

  sealed trait BookSize

  case class A4Landscape() extends BookSize

  case class Landscape() extends BookSize

  val models: Map[Int, BookModel] = Map(
    0 -> BookFactory(A4Landscape()),
    1 -> Blurb(Landscape())
  )

  val default = 1
  val defaultModel = models(default)

  object BookFactory {
    def apply(size: BookSize): BookModel = {
      size match {
        case _: A4Landscape =>
          BookfactoryModel(
            coverFold = 17,
            coverSize = (646, 249),
            cover = CoverModel(w = 297.0, h = 210.0, bleed = 3, spine=0),
            page = PageModel(w = 297.0, h = 210.0, bleed = 3))
      }
    }
  }

  object Blurb {
    def apply(size: BookSize): BookModel = {
      size match {
        case _: Landscape =>
          BlurbModel(
            coverSize = (523.16, 228.6),
            cover = CoverModel(w = 507.64, h = 213.08, bleed = 7.76, spine = 11.64),
            page = PageModel(w = 241.3, h = 203.21, bleed = 3.17)
          )
      }
    }
  }

  def indexOf(model: BookModel): Int =
    models.find { case (i, m) => m == model }.map(_._1).getOrElse(default)
}