package bigpiq.client

import bigpiq.client.components.Selected
import bigpiq.shared._
import diode.data.{Pot,Ready}
import org.scalajs.dom.File


case class CreateUser()
case class GetUser(id: Long)
case class UpdateUser(user: Pot[User])
object UpdateUser { def apply(u: User) = new UpdateUser(Ready(u)) }
case class UpdateUserThenUpload(user: Pot[User], files: List[File])

case class GetFromHash()
case class GetFromCookie()

case class CreateAlbum(userID: Long)
case class UpdateAlbum(album: Album)
case class UpdateCollectionThenUpload(album: Pot[Album], files: List[File])
case class UpdateTitle(title: String)

case class FileUploaded(photo: Photo)

case class AddToCover(selected: Selected)
case class MoveTile(from: Selected, to: Selected)
case class RemoveTile(tile: Selected)
case class RemoveLastPage()

case class UploadFiles(files: List[File], index: Int = 0)
case class MakePages(photos: List[Photo], index: Int)
case class ShufflePage(index: Int)
case class UpdatePages(pages: List[Page])
object UpdatePages { def apply(page: Page) = new UpdatePages(List(page)) }

case class GetAlbum(hash: String)
// case class SetPages(pages: List[Page])
case class SaveAlbum()
case class EmailAndSave(email: String)
