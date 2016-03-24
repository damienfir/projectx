package bigpiq.client

import bigpiq.client.components.Selected
import bigpiq.shared._
import diode.data.{Pot,Ready}
import org.scalajs.dom.File


case class AddToCover(selected: Selected)
//case class CreateUser()
//case class CreateAlbum(userID: Long)
case class EmailAndSave(email: String)
case class FileUploaded(photo: Photo)
case class GetUser(id: Long)
case class GetFromHash()
case class GetFromCookie()
case class GetAlbum(hash: String)
case class MakePages(albumID: Long, photos: List[Photo], index: Int)
case class MoveTile(from: Selected, to: Selected)
case class MovePageLeft(page: Page)
case class MovePageRight(page: Page)
case class NoOp()
case class RemoveTile(tile: Selected)
case class RemoveLastPage()
case class RequestUpload(index: Int)
case class SaveAlbum()
case class ShufflePage(index: Int)
case class UpdatePages(pages: List[Page])
case class UpdateAlbum(album: Album)
case class UpdateCollectionThenUpload(album: Pot[Album], files: List[File])
case class UpdateTitle(title: String)
case class UpdateUser(user: Pot[User])
case class UpdateUserThenUpload(user: Pot[User], files: List[File])
case class UploadFiles(files: List[File])

object UpdatePages { def apply(page: Page) = new UpdatePages(List(page)) }
object UpdateUser { def apply(u: User) = new UpdateUser(Ready(u)) }