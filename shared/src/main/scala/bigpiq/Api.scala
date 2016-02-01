package bigpiq.shared

import scala.concurrent.Future


trait Api {

  def getUser(id: Long): Future[User]

  def createUser(): Future[User]

  def createAlbum(userID: Long): Future[Album]

  def sendLink(userID: Long, email: String, hash: String): Future[String]

  def getAlbumFromHash(userID: Long, hash: String): Future[Album]

  def saveAlbum(album: Album): Future[Album]

  def shufflePage(page: Page, photos: List[Photo]): Future[Page]

  def generatePage(albumID: Long, photos: List[Photo], index: Int): Future[Page]

}