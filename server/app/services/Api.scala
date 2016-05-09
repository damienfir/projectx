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

  val dim = (297, 210)
  val ratio = dim._1.toFloat / dim._2.toFloat
  val demoID = Play.current.configuration.getString("px.demoID").get


  def getUser(id: Long): Future[User] = usersDAO.get(id)

  def createUser: Future[User] = usersDAO.insert

  def createAlbum(userID: Long): Future[Album] = collectionDAO.withUser(userID)

  def sendLink(userID: Long, email: String, hash: String): Future[String] =
    emailService.sendLink(email, hash)

  def getAlbumFromHash(userID: Long, hash: String): Future[Album] =
    collectionDAO.getByHash(userID, hash)

  def saveAlbum(album: Album): Future[Album] =
    if (album.hash.equals(demoID)) Future(album)
    else if (album.pages.isEmpty) Future(album)
    else collectionDAO.update(album)

  def generatePage(albumID: Long, photos: List[Photo], index: Int): Future[Page] =
    collectionDAO.getCollection(albumID) flatMap { album =>
      photoDAO.getSet(photos.map(_.id)) flatMap { photosDB =>
        if (album.hash.equals(demoID)) {
          imageService.generateComposition(photosDB) map { tiles =>
            Page(Random.nextLong(), index, tiles)
          }
        } else {
          for {
            page <- collectionDAO.addPage(albumID)
            tiles <- imageService.generateComposition(photosDB)
            updatedPage <- collectionDAO.updatePage(albumID, page.copy(tiles = tiles, index = index))
          } yield updatedPage
        }
      }
    }

  def shufflePage(page: Page, photos: List[Photo]): Future[Page] = {
    photoDAO.getSet(photos.map(_.id)) flatMap { photosDB =>
      imageService.generateComposition(photosDB) map { tiles =>
        page.copy(tiles = tiles)
      }
    }
  }

  def pdf(hash: String): Future[File] =
    collectionDAO.getByHash(0, hash) flatMap { album =>
      photoDAO.allFromCollection(album.id) flatMap { photos =>
        val tiles = album.pages.flatMap(_.tiles)
        val photoFiles = photos.flatMap { photo =>
          tiles.find(_.photo.id == photo.id).map { tile =>
            imageService.convert(photo.data, "full", "full", tile.rot.toString, "default", "jpg") map { bytes =>
              photo.id.get -> imageService.bytesToFile(bytes)
            }
          }
        }

        Future.sequence(photoFiles) map { files =>
          val svgFiles = album.pages.map(p =>
            views.html.page(p, if (p.index == 0) Some(album.title) else None, files.map({ case (id, f) => (id, f.getName) }).toMap, dim, ratio).toString)

          imageService.makeAlbumFile(svgFiles)
        }
      }
    }

  def reorderPhotos(albumID: Long): Future[List[Photo]] = {
    photoDAO.allFromCollection(albumID) map { photos =>
      val (canSort, cannotSort) = photos.map(p => (p, imageService.getDate(p.data))).partition(_._2.isDefined)
      canSort.sortBy({ case (p, date) => date }).map(_._1.export).toList ++ cannotSort.map(_._1.export)
    }
  }
}