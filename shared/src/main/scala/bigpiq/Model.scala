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


case class PageModel(w: Double, h: Double, bleed: Double) {
  def ratio: Double = w / h
  def size: (Double, Double) = (w, h)
}


trait BookModel {
  val minPagesTotal: Int
  val cover: PageModel
  val page: PageModel
  val mustBeEven: Boolean
  val pdfVersion: String
  val minDPI: Int
  val blankBackside: Boolean

  def coverSize: (Double, Double)

  def coverOffset: (Double, Double)

  def pageSize: (Double, Double)

  def pageOffset: (Double, Double)
}


case class BookfactoryModel(minPagesTotal: Int = 16,
                       mustBeEven: Boolean = false,
                       pdfVersion: String = "PDF 1.4",
                       minDPI: Int = 200,
                       blankBackside: Boolean = true,
                       cover: PageModel,
                       page: PageModel,
                       coverFold: Int,
                       coverSpine: Double)
  extends BookModel {

  def coverOffset = (coverFold + cover.w + cover.bleed + coverSpine + 0.5 * cover.bleed, cover.bleed)

  def coverSize = (cover.w + 2 * cover.bleed, cover.h + 2 * cover.bleed)

  def pageOffset = (page.bleed, page.bleed)

  def pageSize = (page.w + 2 * page.bleed, page.h + 2 * page.bleed)

  def adjustSpine(spine: Double) = this.copy(coverSpine = spine)
}


object BookModels {

  sealed trait BookType

  case class A4Landscape() extends BookType

  val models: Map[Int, BookModel] = Map(
    0 -> BookFactory(A4Landscape())
  )

  val default = 0
  val defaultModel = models.get(default).get

  object BookFactory {
    def apply(size: BookType): BookModel = {
      size match {
        case _: A4Landscape =>
          BookfactoryModel(
            coverFold = 15,
            coverSpine = 6,
            cover = PageModel(w = 297.0, h = 210.0, bleed = 5),
            page = PageModel(w = 297.0, h = 210.0, bleed = 3))
      }
    }
  }

  def indexOf(model: BookModel): Int =
    models.find { case (i, m) => m == model }.map(_._1).getOrElse(default)
}