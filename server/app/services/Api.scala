package bigpiq.server.services

import play.api.libs.concurrent.Execution.Implicits.defaultContext
import scala.concurrent.Future
import javax.inject.Inject
import java.io._

import bigpiq.shared._
import bigpiq.server.db



class ServerApi @Inject() (usersDAO: db.UsersDAO, collectionDAO: db.CollectionDAO, mosaicService: MosaicService, emailService: Email, imageService: ImageService) extends Api {

  def getUser(id: Long): Future[User] = usersDAO.get(id)

  def createUser: Future[User] = usersDAO.insert

  def createAlbum(userID: Long): Future[Album] = collectionDAO.withUser(userID)

  def sendLink(userID: Long, email: String, hash: String): Future[String] =
    emailService.sendLink(email, hash)

  def getAlbumFromHash(userID: Long, hash: String): Future[Album] =
    collectionDAO.getByHash(userID, hash)

  def saveAlbum(album: Album): Future[Album] = collectionDAO.update(album)

  def generatePage(albumID: Long, photos: List[Photo], index: Int): Future[Page] = for {
    page <- collectionDAO.addPage(albumID)
    tiles <- mosaicService.generateComposition(page.id, photos)
    updatedPage <- collectionDAO.updatePage(albumID, page.copy(tiles=tiles, index=index))
  } yield updatedPage

  def shufflePage(page: Page, photos: List[Photo]): Future[Page] = {
    mosaicService.generateComposition(page.id, photos) map ( tiles =>
      page.copy(tiles = tiles)
    )
  }

  def pdf(hash: String): Future[File] =
    collectionDAO.getByHash(0, hash) map { album =>
      val tiles = album.pages.map(_.tiles).reduce((acc, t) => acc ++ t)
      val photoFiles = tiles.map(t => t.photo.id -> imageService.bytesToFile(imageService.convert(t.photo.hash, "full", "full", t.rot.toString, "default", "jpg"))).toMap
      val svgFiles = album.filter.pages.map(p => views.html.page(p, if (p.index == 0) Some(album.title) else None, photoFiles).toString)
      mosaicService.makeAlbumFile(svgFiles)
    }
}