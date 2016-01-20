package bigpiq.client

import org.scalajs.dom.File
import diode.data.{Empty, Pot, Ready}
import bigpiq.shared._
import bigpiq.client.views.{Move, Selected}


case class CreateUser()
case class GetUser(id: Long)
case class UpdateUser(user: Pot[User])
case class UpdateUserThenUpload(user: Pot[User], files: List[File])
case class GetFromCookie()

case class CreateCollection(userID: Long)
case class UpdateCollection(collection: Collection)
case class UpdateCollectionThenUpload(collection: Pot[Collection], files: List[File])

case class FileUploaded(photo: Photo)
case class UpdatePhotos(photos: List[Photo])

case class AddToCover(selected: Selected)
case class MoveTile(from: Selected, to: Selected)
case class RemoveTile(tile: Selected)
case class RemoveLastPage()

case class UploadFiles(files: List[File], index: Int = 0)
case class MakePages(photos: List[Photo], index: Int)
case class ShufflePage(index: Int)
case class UpdatePages(pages: Pot[List[Composition]])
case class UpdateFromHash(stored: Stored)
case class GetAlbum(hash: String)
case class SetAlbum(album: Pot[List[Composition]])
case class GetFromHash()
case class SaveAlbum()
