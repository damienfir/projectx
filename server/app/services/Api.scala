package bigpiq.server.services

import java.util.UUID

import play.api.Play
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import scala.concurrent.Future
import javax.inject.Inject
import java.io._

import bigpiq.shared._
import bigpiq.server.db

import scala.util.Random


class ServerApi @Inject()(usersDAO: db.UsersDAO, collectionDAO: db.CollectionDAO, photoDAO: db.PhotoDAO, emailService: Email, imageService: ImageService) extends Api {

  val demoID = Play.current.configuration.getString("px.demoID").get

  def getUser(id: Long): Future[User] = usersDAO.get(id)

  def createUser: Future[User] = usersDAO.insert

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
    collectionDAO.getCollection(albumID) flatMap { album =>
      photoDAO.getSet(photos.map(_.id)) flatMap { photosDB =>
        if (album.hash.equals(demoID)) {
          imageService.generateComposition(photosDB, ratio) map { tiles =>
            Page(Random.nextLong(), index, tiles)
          }
        } else {
          for {
            page <- collectionDAO.addPage(albumID)
            tiles <- imageService.generateComposition(photosDB, ratio)
            updatedPage <- collectionDAO.updatePage(albumID, page.copy(tiles = tiles, index = index))
          } yield updatedPage
        }
      }
    }

  def shufflePage(page: Page, photos: List[Photo], ratio: Double): Future[Page] = {
    photoDAO.getSet(photos.map(_.id)) flatMap { photosDB =>
      imageService.generateComposition(photosDB, ratio) map { tiles =>
        page.copy(tiles = tiles)
      }
    }
  }

  def pdf(hash: String): Future[File] =
    collectionDAO.getByHash(0, hash) flatMap { album =>
      photoDAO.allFromCollection(album.id) flatMap { photos =>
        val tiles = album.pages.flatMap(_.tiles)
        val photoFiles = photos.flatMap { photo =>
          tiles.find(_.photo.id == photo.id.get).map { tile =>
            imageService.convert(photo.data, "full", "full", tile.rot.toString, "default", "jpg") map { bytes =>
              (photo.id.get, imageService.bytesToFile(bytes))
            }
          }
        }

        Future.sequence(photoFiles)
          .map(_.map({
            case (id, f: File) => (id, f.getAbsolutePath)
          }).toMap)
          .flatMap { filesMap =>
            val svgFiles = album.sort.withBlankPages.pages.map(p => {
              if (p.index == 0) {
                views.html.coverSVG(p, album.title, filesMap, album.bookModel).toString
              }
              else {
                views.html.pagesSVG(p, filesMap, album.bookModel).toString
              }
            })

            imageService.makeAlbumFile(svgFiles, album.bookModel)
          }
      }
    }
;;
  def reorderPhotos(albumID: Long): Future[List[Photo]] = {
    photoDAO.allFromCollection(albumID) map { photos =>
      val (canSort, cannotSort) = photos.map(p => (p, imageService.getDate(p.data))).partition(_._2.isDefined)
      canSort.sortBy({ case (p, date) => date }).map(_._1.export).toList ++ cannotSort.map(_._1.export)
    }
  }
}
