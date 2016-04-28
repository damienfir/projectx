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


class ServerApi @Inject()(usersDAO: db.UsersDAO, collectionDAO: db.CollectionDAO, photoDAO: db.PhotoDAO, mosaicService: MosaicService, emailService: Email, imageService: ImageService) extends Api {

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
    else collectionDAO.update(album)

  def generatePage(albumID: Long, photos: List[Photo], index: Int): Future[Page] =
    collectionDAO.getCollection(albumID) flatMap { album =>
      if (album.hash.equals(demoID)) {
        val id = Random.nextLong()
        mosaicService.generateComposition(id, photos) map { tiles =>
          Page(id, index, tiles)
        }
      } else {
        for {
          page <- collectionDAO.addPage(albumID)
          tiles <- mosaicService.generateComposition(page.id, photos)
          updatedPage <- collectionDAO.updatePage(albumID, page.copy(tiles = tiles, index = index))
        } yield updatedPage
      }
    }

  def shufflePage(page: Page, photos: List[Photo]): Future[Page] = {
    mosaicService.generateComposition(page.id, photos) map (tiles =>
      page.copy(tiles = tiles)
      )
  }

  def pdf(hash: String): Future[File] =
    for {
      album <- collectionDAO.getByHash(0, hash)
      photos <- photoDAO.allFromCollection(album.id)
    } yield {
      val tiles = album.pages.flatMap(_.tiles)
      val photoFiles = photos.map { photo =>
        photo.id.get -> tiles.find(_.photo.id == photo.id).map { tile =>
          imageService.bytesToFile(imageService.convert(photo.data, "full", "full", tile.rot.toString, "default", "jpg"))
        }
      }.filter({ case (_, v) => v.isDefined })
        .map({ case (k, Some(v)) => (k, v) })
        .toMap

      val svgFiles = album.filter.pages.map(p =>
        views.html.page(p, if (p.index == 0) Some(album.title) else None, photoFiles, dim, ratio).toString)

      mosaicService.makeAlbumFile(svgFiles)
    }

  def reorderPhotos(albumID: Long): Future[List[Photo]] = {
    photoDAO.allFromCollection(albumID) map { photos =>
      val (canSort, cannotSort) = photos.map(p => (p, imageService.getDate(p.data))).partition(_._2.isDefined)
      canSort.sortBy({ case (p,date) => date }).map(_._1.export).toList ++ cannotSort.map(_._1.export)
    }
  }
}
