package bigpiq.services

import play.api.Play
import play.api.libs.concurrent.Execution.Implicits.defaultContext

import scala.concurrent.Future
import javax.inject.Inject
import java.io._

import bigpiq.shared._
import bigpiq.services._
import bigpiq.db
import bigpiq.db.PhotoData

import scala.util.Random


class ServerApi @Inject()(
                           usersDAO: db.UsersDAO,
                           collectionDAO: db.CollectionDAO,
                           photoDAO: db.PhotoDAO,
                           emailService: EmailService,
                           imageService: ImageService,
                           mosaicService: MosaicService
                         ) extends Api {

  val demoID = Play.current.configuration.getString("px.demoID").get

  def getUser(id: Long): Future[User] = usersDAO.get(id)

  def createUser(): Future[User] = usersDAO.insert

  def createAlbum(userID: Long): Future[Album] = collectionDAO.withUser(userID)

  def sendLink(userID: Long, email: String, hash: String): Future[String] =
    emailService.sendLink(email, hash)

  def getAlbumFromHash(hash: String): Future[(User, Album)] =
    for {
      album <- collectionDAO.getByHash(0, hash)
      user <- usersDAO.getFromAlbum(album.id)
    } yield (user, album)

  def saveAlbum(album: Album): Future[Album] =
    if (album.hash.equals(demoID)) Future(album)
    else collectionDAO.update(album)

  def generatePage(albumID: Long, photos: List[Photo], index: Int, ratio: Double): Future[Page] =
    collectionDAO.getCollection(albumID) flatMap {
      album =>
        photoDAO.getSet(photos.map(_.id)) flatMap {
          photosDB =>
            if (album.hash.equals(demoID)) {
              mosaicService.generateComposition(photosDB, ratio) map {
                tiles =>
                  Page(Random.nextLong(), index, tiles)
              }
            } else {
              for {
                page <- collectionDAO.addPage(albumID)
                tiles <- mosaicService.generateComposition(photosDB, ratio)
                updatedPage <- collectionDAO.updatePage(albumID, page.copy(tiles = tiles, index = index))
              } yield updatedPage
            }
        }
    }

  def shufflePage(page: Page, photos: List[Photo], ratio: Double): Future[Page] = {
    photoDAO.getSet(photos.map(_.id)) flatMap {
      photosDB =>
        mosaicService.generateComposition(photosDB, ratio) map {
          tiles =>
            page.copy(tiles = tiles)
        }
    }
  }


  def reorderPhotos(albumID: Long): Future[List[Photo]] = {
    photoDAO.allFromCollection(albumID) map {
      photos =>
        val (canSort, cannotSort) = photos
          .map { case (photo, data) => (photo, imageService.getDate(data.data)) }
          .partition(_._2.isDefined)
        (canSort.sortBy { case (p, date) => date.get } ++ cannotSort)
          .map(_._1.export)
    }
  }
}


class PDFApi @Inject()(collectionDAO: db.CollectionDAO, photoDAO: db.PhotoDAO, imageService: ImageService, mosaicService: MosaicService) {
  def pdf(hash: String, spine: Double): Future[File] =
    collectionDAO.getByHash(0, hash) flatMap { album =>
      val bookModel = album.bookModel.adjustSpine(spine)
      photoDAO.allFromCollection(album.id) flatMap { photos =>
        val tiles = album.pages.flatMap(_.tiles)
        val photoFiles = photos.flatMap { case (photo, data) =>
          tiles.find(_.photo.id == photo.id.get).map { tile =>
            imageService.convert(data.data, "full", "full", tile.rot.toString, "default", "jpg") map { bytes =>
              (photo.id.get, imageService.bytesToFile(bytes))
            }
          }
        }

        Future.sequence(photoFiles)
          .map(_.map({
            case (id, f: File) => (id, f.getAbsolutePath)
          }).toMap)
          .flatMap { filesMap =>
            val svgFiles: List[String] = album.sort.withBlankPages.pages.map(p => {
              if (p.index == 0) {
                views.html.coverSVG(p, album.title, filesMap, bookModel).toString
              }
              else {
                views.html.pagesSVG(p, filesMap, bookModel).toString
              }
            })

            mosaicService.makeAlbumFile(svgFiles, album.bookModel)
          }
      }
    }
}