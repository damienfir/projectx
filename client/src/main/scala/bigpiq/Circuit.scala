package bigpiq.client

import bigpiq.client.views.{Move, Selected}
import bigpiq.shared._
import diode._
import diode.data.{Empty, Pot, Ready}
import diode.react.ReactConnector
import org.scalajs.dom.File
import org.scalajs.dom.ext.Ajax
import org.scalajs.dom.raw.FormData
import org.scalajs.jquery.{JQueryAjaxSettings, _}
import upickle.default._

import scala.concurrent.ExecutionContext.Implicits.global
import collection.breakOut
import scala.concurrent.{Future, Promise}
import scala.scalajs.js
import scala.scalajs.js.Dynamic.{global => g}
import scala.util.{Try, Random}


case class Save(album: List[Composition], collection: Collection)

object Api {
  def postJSON(url: String, data: String) = Ajax.post(
    url=url,
    data=data,
    responseType="text", // uPickle can't parse js.Object
    headers = Map("Content-Type" -> "application/json")
  ).map(r => r.responseText)

  def getUser(id: Long): Future[Pot[User]] = Ajax.get(s"/users/$id")
    .map(r => Ready(read[User](r.responseText)))

  def createUser(): Future[Pot[User]] = postJSON(s"/users", "{}")
    .map(v => Ready(read[User](v)))
    .recover({
      case ex: upickle.Invalid.Json =>
        g.console.log("json failed: " + ex.msg + " -> " + ex.input)
        Empty
      case ex: upickle.Invalid.Data =>
        g.console.log("data failed: " + ex.msg + " -> " + ex.data)
        Empty
    })

  def getUserFromCookie(): Option[Long] = Some(93)

  def getAlbumFromHash(userID: Long, hash: String): Future[Stored] = Ajax.get(s"/users/$userID/albums/$hash")
    .map(r => read[Stored](r.responseText))
    .recover({case ex =>
        g.console.log(ex.toString)
        throw ex
    })

  def getAlbumHash(): Option[String] =  Some("63cc8b33-c6e8-4fbd-ac6d-6a825fe610d9")

  def createCollection(userID: Long) : Future[Pot[Collection]] = postJSON(s"/users/$userID/collections", "{}")
    .map(r => Ready(read[Collection](r)))
    .recover({
      case ex: upickle.Invalid.Json =>
        g.console.log("json failed: " + ex.msg + " -> " + ex.input)
        Empty
      case ex: upickle.Invalid.Data =>
        g.console.log("data failed: " + ex.msg + " -> " + ex.data)
        Empty
    })

  def makePages(photos: List[Photo], collectionID: Long, index: Int) : Future[Pot[List[Composition]]] =
    postJSON(s"/collections/$collectionID/pages?index=$index", write(photos))
      .map(v => Ready(List(read[Composition](v)))).recover({
      case ex: Exception =>
        g.console.log(ex.toString)
        Empty
    })

  def save(toSave: Save) = {
    postJSON(s"/save", write(toSave))
  }
}

case class CreateUser()
case class GetUser(id: Long)
case class UpdateUser(user: Pot[User])
case class UpdateUserThenUpload(user: Pot[User], files: List[File])
case class GetFromCookie()

class UserHandler[M](modelRW: ModelRW[M, Pot[User]]) extends ActionHandler(modelRW) {

  override def handle = {
    case UpdateUser(user) => updated(user)
//    case UpdateUserThenUpload(user, files) =>
//      g.console.log("update then upload")
//      updated(Ready(user),
//      Effect(Future(UploadFiles(files, Empty, Ready(user)))))
    case GetUser(id) => effectOnly(Effect(Api.getUser(id).map(u => UpdateUser(u))))
//    case CreateUser => effectOnly(UserApi.createUser())
    case GetFromCookie => effectOnly {
      Effect(Future(Api.getUserFromCookie().map(GetUser)).map(_.getOrElse(None))) >>
      Effect.action(GetFromHash)
    }
  }
}


case class FileUploaded(photo: Photo)
case class UpdatePhotos(photos: List[Photo])

class PhotoHandler[M](modelRW: ModelRW[M, List[Photo]]) extends ActionHandler(modelRW) {

  override def handle = {
    case UpdatePhotos(photos) => updated((value ++ photos).distinct)
    case FileUploaded(photo) => updated(value :+ photo)
  }
}




case class CreateCollection(userID: Long)
case class UpdateCollection(collection: Collection)
case class UpdateCollectionThenUpload(collection: Pot[Collection], files: List[File])

case class AddToCover(selected: Selected)
case class MoveTile(from: Selected, to: Selected)

class AlbumHandler[M](modelRW: ModelRW[M, RootModel]) extends ActionHandler(modelRW) {

  def getPhotos(index: Int) =
    value.photos.filter(p => value.album.get(index).tiles.exists(_.photoID == p.id))

  override def handle = {

    case AddToCover(selected) => {
      g.console.log("add to cover")
      noChange
    }

    case MoveTile(from, to) => {
      val fromPhotos = getPhotos(from.page)
      val toPhotos = getPhotos(to.page)
      val photoID = value.album.get(from.page).tiles(from.index).photoID

      if (value.album.get(from.page).tiles.length == 1) {
        if (from.page == value.album.get.length-1) {
          val lastPage = value.album.get(from.page).copy(tiles = Nil)
          effectOnly(Effect(Api.makePages(toPhotos ++ fromPhotos, value.collection.get.id, to.page)
            .map(pages => UpdatePages(Ready(pages.get :+ lastPage)))))
        } else noChange
      } else effectOnly {
        Effect(Api.makePages(fromPhotos.filter(_.id != photoID), value.collection.get.id, from.page).map(UpdatePages)) +
        Effect(Api.makePages(toPhotos ++ fromPhotos.filter(_.id == photoID), value.collection.get.id, to.page).map(UpdatePages))
      }
    }

    case SetAlbum(album) => {
      updated(value.copy(album = album))
    }
  }
}

case class UploadFiles(files: List[File], index: Int = 0)
case class MakePages(photos: List[Photo], index: Int)
case class UpdatePages(pages: Pot[List[Composition]])
case class UpdateFromHash(stored: Stored)
case class GetAlbum(hash: String)
case class SetAlbum(album: Pot[List[Composition]])
case class GetFromHash()
case class TestAction()
case class SaveAlbum()


class FileUploadHandler[M](modelRW: ModelRW[M, RootModel]) extends ActionHandler(modelRW) {
  def uploadFile(file: File, id: Int) = {
    var fd = new FormData()
    fd.append("image", file)
    val p = Promise[Photo]()
    jQuery.ajax(js.Dynamic.literal(
      url = s"/collections/$id/photos",
      method = "POST",
      data = fd,
      processData = false,
      contentType = false,
      dataType = "text",
      success = (data: String) => p.success(read[Photo](data))
    ).asInstanceOf[JQueryAjaxSettings])
    p.future
  }

  def handle = {
    case UploadFiles(files, index) => value.user match {
      case Ready(user) => value.collection match {
        case Ready(collection) => files match {
          case Nil => noChange
          case _: List[_] =>
            val (fileSet, rest) =
              if (index == 0) (files.take(1), files)
              else files.splitAt(Math.min(new Random().nextInt(3)+1, files.length))
            effectOnly {
              Effect(Future.sequence(fileSet.map(f => uploadFile(f, collection.id)))
                .map(photos => MakePages(photos, index))) >>
              Effect.action(UploadFiles(rest, index+1))
            }
        }
        case Empty => effectOnly(Effect(Api.createCollection(user.id)
            .map({
              case col: Ready[_] => UpdateCollectionThenUpload(col, files)
              case _ => None
            })
        ))
        case _ => noChange
      }
      case Empty => effectOnly(Effect(Api.createUser().map({
          case user: Ready[_] => UpdateUserThenUpload(user, files)
          case _ => None
        })))
      case _ => noChange
    }

    case UpdateUserThenUpload(user, files) =>
      updated(value.copy(user = user), Effect.action(UploadFiles(files)))

    case UpdateCollectionThenUpload(col, files) =>
      updated(value.copy(collection = col), Effect.action(UploadFiles(files)))

    case MakePages(photos, index) => effectOnly {
      Effect(Api.makePages(photos, value.collection.get.id, index).map(p => UpdatePages(p)))
    }

    case UpdatePages(pages) => {
      g.console.log("update pages")
      pages match {
      case Ready(newPages) => updated(value.copy(album = Ready(value.album match {
        case Ready(existingPages) => existingPages
          .filter(p => !newPages.exists(_.index == p.index)) ++ newPages
        case _ => newPages
      })
        .map(_.filter(_.tiles.nonEmpty).groupBy(_.index).map(_._2.head).toList.sortBy(_.index))),
        Effect.action(SaveAlbum))
      case _ => noChange
    }}

    case TestAction => {
      noChange
    }

    case UpdateCollection(collection) => updated(value.copy(collection = Ready(collection)))

    case UpdateFromHash(stored) => effectOnly {
      Effect(Future(UpdateCollection(stored.collection))) >>
      Effect(Future(UpdatePhotos(stored.photos))) >>
      Effect(Future(UpdatePages(Ready(stored.pages))))
    }

    case GetAlbum(hash) => effectOnly {
      Effect(Api.getAlbumFromHash(0, hash).map(s => UpdateFromHash(s)).recover({case ex => None}))
    }

    case GetFromHash => effectOnly {
      Effect(Future(Api.getAlbumHash().map(h => GetAlbum(h))).map(_.getOrElse(None)))
    }

    case SaveAlbum => effectOnly {
      Effect(Api.save(Save(value.album.get, value.collection.get)))
    }
  }
}


object AppCircuit extends Circuit[RootModel] with ReactConnector[RootModel] {
  override protected var model: RootModel = RootModel()

  override protected def actionHandler = combineHandlers(
    new UserHandler(zoomRW(_.user)((m,v) => m.copy(user = v))),
    new PhotoHandler(zoomRW(_.photos)((m,v) => m.copy(photos = v))),
    new FileUploadHandler(zoomRW(identity)((m,v) => v)),
    new AlbumHandler(zoomRW(identity)((m,v) => v))
  )
}
