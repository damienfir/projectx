package bigpiq.client


import bigpiq.client.components.Selected
import bigpiq.shared._
import diode._
import diode.data.{Empty, Pot, Ready}
import diode.react.ReactConnector

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.util.Random


case class Save(album: List[Composition], collection: Collection)



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


class PhotoHandler[M](modelRW: ModelRW[M, List[Photo]]) extends ActionHandler(modelRW) {

  override def handle = {
    case UpdatePhotos(photos) => updated(value ++ photos)
    case FileUploaded(photo) => updated(value :+ photo)
  }
}


class AlbumHandler[M](modelRW: ModelRW[M, RootModel]) extends ActionHandler(modelRW) {

  def getPhotos(index: Int) =
    value.photos.filter(p => value.album.get(index).tiles.exists(_.photoID == p.id.get))

  def getID(selected: Selected) = value.album.get(selected.page).tiles(selected.index).photoID

  def shuffle(photos: List[Photo], selected: Selected) =
    Api.shufflePage(photos, value.collection.get.id.get, value.album.get(selected.page).id.get)

  override def handle = {

    case AddToCover(selected) => effectOnly {
      val photoToAdd = getPhotos(selected.page).filter(_.id == getID(selected))
      Effect(Api.shufflePage(getPhotos(0) ++ photoToAdd, value.collection.get.id.get, value.album.get(0).id.get)
        .map(UpdatePages))
    }

    case RemoveLastPage => effectOnly{
      println("remove last page")
      Effect.action(UpdatePages(value.album.map(al => List(al.last.copy(tiles = Nil)))))
    }

    case MoveTile(from, to) => {
      val fromPhotos = getPhotos(from.page)
      val fromComposition = value.album.get(from.page)
      val photoID = getID(from)

      if (to.page == -1) 
        if (fromPhotos.length == 1) noChange else effectOnly {
        Effect(Api.shufflePage(fromPhotos.filter(_.id != Some(photoID)), value.collection.get.id.get, fromComposition.id.get).map(UpdatePages)) +
        Effect(Api.makePages(fromPhotos.filter(_.id == Some(photoID)), value.collection.get.id.get, value.album.get.length).map(UpdatePages))
      } else {
        val toPhotos = getPhotos(to.page)
        val toComposition = value.album.get(to.page)

        if (fromPhotos.length == 1) {
          if (from.page == value.album.get.length-1) effectOnly {
            Effect(Api.shufflePage(toPhotos ++ fromPhotos, value.collection.get.id.get, toComposition.id.get)
              .map(UpdatePages)) +
            Effect.action(RemoveLastPage)
          } else noChange

          } else effectOnly {
            Effect(Api.shufflePage(fromPhotos.filter(_.id != Some(photoID)), value.collection.get.id.get, fromComposition.id.get).map(UpdatePages)) +
            Effect(Api.shufflePage(toPhotos ++ fromPhotos.filter(_.id == Some(photoID)), value.collection.get.id.get, toComposition.id.get).map(UpdatePages))
          }
      }
    }

    case SetAlbum(album) => {
      updated(value.copy(album = album))
    }

    case ShufflePage(index: Int) => effectOnly {
      val page = value.album.get(index)
      Effect(Api.shufflePage(getPhotos(index), value.collection.get.id.get, page.id.get).map(UpdatePages))
    }

    case RemoveTile(selected) => effectOnly {
      Effect(shuffle(getPhotos(selected.page).filter(_.id != Some(getID(selected))), selected).map(UpdatePages))
    }
  }
}


class CollectionHandler[M](modelRW: ModelRW[M, Pot[Collection]]) extends ActionHandler(modelRW) {
  def handle = {
    case UpdateTitle(title) => updated(value.map(c => c.copy(name = Some(title))))
  }
}


class FileUploadHandler[M](modelRW: ModelRW[M, RootModel]) extends ActionHandler(modelRW) {

  def handle = {
    case UploadFiles(files, index) => value.user match {
      case Ready(user) => value.collection match {
        case Ready(collection) => files match {
          case Nil => noChange
          case _: List[_] =>
            val updatedIndex = value.album match {
              case Ready(pages) => if (index == 0) pages.length else index
              case _ => index
            }
            val (fileSet, rest) =
              if (updatedIndex == 0) (files.take(1), files)
              else files.splitAt(Math.min(new Random().nextInt(3)+1, files.length))
            effectOnly {
              Effect(Future.sequence(fileSet.map(f => Api.uploadFile(f, collection.id.get)))
                .map(photos => MakePages(photos, updatedIndex))) >>
              Effect.action(UploadFiles(rest, updatedIndex+1))
            }
        }
        case Empty => effectOnly(Effect(Api.createCollection(user.id.get)
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
      Effect(Api.makePages(photos, value.collection.get.id.get, index).map(p => UpdatePages(p)))
    }

    case UpdatePages(pages) => pages match {
      case Ready(newPages) => updated(value.copy(album = Ready(value.album match {
        case Ready(existingPages) => existingPages
          .filter(p => !newPages.exists(_.index == p.index)) ++ newPages
        case _ => newPages
      })
        .map(_.filter(_.tiles.nonEmpty).groupBy(_.index).map(_._2.head).toList.sortBy(_.index))))
      case _ => noChange
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
    new CollectionHandler(zoomRW(_.collection)((m,v) => m.copy(collection = v))),
    new AlbumHandler(zoomRW(identity)((m,v) => v))
  )
}
