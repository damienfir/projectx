package bigpiq.server.services

import play.api.libs.concurrent.Execution.Implicits.defaultContext
import scala.concurrent.Future
import javax.inject.Inject

import bigpiq.shared._
import bigpiq.server.db


class ServerApi @Inject() (usersDAO: db.UsersDAO, collectionDAO: db.CollectionDAO, mosaicService: MosaicService, emailService: Email) extends Api {

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
    _ <- collectionDAO.updatePage(albumID, page.copy(tiles=tiles, index=index))
  } yield page

  def shufflePage(page: Page, photos: List[Photo]): Future[Page] = {
    mosaicService.generateComposition(page.id, photos) map ( tiles =>
      page.copy(tiles = tiles)
    )
  }
}