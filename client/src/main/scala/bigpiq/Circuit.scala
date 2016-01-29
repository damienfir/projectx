package bigpiq.client


import bigpiq.client.components.Selected
import bigpiq.shared._
import diode._
import diode.data.{Empty, Pot, Ready}
import diode.react.ReactConnector

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.util.Random

case class RootModel(user: Pot[User] = Empty, album: Pot[Album] = Empty)


class UserHandler[M](modelRW: ModelRW[M, Pot[User]]) extends ActionHandler(modelRW) {

  override def handle = {
    case UpdateUser(user) => updated(user)
    case GetUser(id) => effectOnly(Effect(AjaxClient[Api].getUser(id).map(UpdateUser(_))))
//    case CreateUser => effectOnly(UserApi.createUser())
    case GetFromCookie => effectOnly {
      Effect(Future(Helper.getUserIDFromCookie.map(GetUser).getOrElse(None))) >>
      Effect.action(GetFromHash)
    }
  }
}




class AlbumHandler[M](modelRW: ModelRW[M, Pot[Album]]) extends ActionHandler(modelRW) {

  def getPhotos(index: Int): List[Photo] =
    value.get.pages(index).tiles.map(_.photo)
//    value.photos.filter(p => value.album.get(index).tiles.exists(_.photoID == p.id.get))

  def getID(selected: Selected) = value.get.pages(selected.page).tiles(selected.index).photo.id


  override def handle = {

    case AddToCover(selected) => effectOnly {
      val photoToAdd = getPhotos(selected.page).filter(_.id == getID(selected))
      Effect(AjaxClient[Api].shufflePage(value.get.pages(selected.page), getPhotos(0) ++ photoToAdd)
        .map(UpdatePages(_)))
    }

    case RemoveLastPage => effectOnly {
      Effect.action(UpdatePages(value.map(album => List(album.pages.last.copy(tiles = Nil)))))
    }

    case MoveTile(from, to) => {
      val fromPhotos = getPhotos(from.page)
      val fromPage = value.get.pages(from.page)
      val photoID = getID(from)

      if (to.page == -1) 
        if (fromPhotos.length == 1) noChange else effectOnly {
        Effect(AjaxClient[Api].shufflePage(fromPage, fromPhotos.filter(_.id != photoID)).map(UpdatePages(_))) +
        Effect(AjaxClient[Api].generatePage(value.get.id, fromPhotos.filter(_.id == photoID), value.get.pages.length).map(UpdatePages(_)))
      } else {
        val toPhotos = getPhotos(to.page)
        val toPage = value.get.pages(to.page)

        if (fromPhotos.length == 1) {
          if (from.page == value.get.pages.length-1) effectOnly {
            Effect(AjaxClient[Api].shufflePage(toPage, toPhotos ++ fromPhotos).map(UpdatePages(_))) +
            Effect.action(RemoveLastPage)
          } else noChange

          } else effectOnly {
            Effect(AjaxClient[Api].shufflePage(fromPage, fromPhotos.filter(_.id != photoID))
              .map(UpdatePages(_))) +
            Effect(AjaxClient[Api].shufflePage(toPage, toPhotos ++ fromPhotos.filter(_.id == photoID)).map(UpdatePages(_)))
          }
      }
    }

    case SetAlbum(album) => updated(album)

    case ShufflePage(index: Int) => effectOnly {
      val page = value.get.pages(index)
      Effect(AjaxClient[Api].shufflePage(page, getPhotos(index)).map(p => Ready(List(p))).map(UpdatePages(_)))
    }

    case RemoveTile(selected) => effectOnly {
      val photos = value.get.pages(selected.page).tiles.map(_.photo).filter(_.id != getID(selected))
      Effect(AjaxClient[Api].shufflePage(value.get.pages(selected.page), photos).map(p => Ready(List(p))).map(UpdatePages(_)))
    }

    case UpdatePages(pages) => pages map { newPages =>
      updated(value.map(album => album.copy(pages =
          (album.pages.filter(p => !newPages.exists(_.index == p.index)) ++ newPages)
        .filter(_.tiles.nonEmpty).groupBy(_.index).map(_._2.head).toList.sortBy(_.index))))
    } getOrElse noChange
  }
}


//class CollectionHandler[M](modelRW: ModelRW[M, Pot[Collection]]) extends ActionHandler(modelRW) {
//  def handle = {
//    case UpdateTitle(title) => updated(value.map(c => c.copy(name = Some(title))))
//  }
//}


class FileUploadHandler[M](modelRW: ModelRW[M, RootModel]) extends ActionHandler(modelRW) {

  def handle = {
    case UploadFiles(files, index) => value.user match {
      case Ready(user) => value.album match {
        case Ready(album) => files match {
          case Nil => noChange
          case _: List[_] =>
            val updatedIndex = album.pages match {
              case Nil => index
              case pages => if (index == 0) pages.length else index
            }
            val (fileSet, rest) =
              if (updatedIndex == 0) (files.take(1), files)
              else files.splitAt(Math.min(new Random().nextInt(3)+1, files.length))
            effectOnly {
              Effect(Future.sequence(fileSet.map(f => Helper.uploadFile(f, album.id)))
                .map(photos => MakePages(photos, updatedIndex))) >>
              Effect.action(UploadFiles(rest, updatedIndex+1))
            }
        }
        case Empty => effectOnly(Effect(AjaxClient[Api].createAlbum(user.id).map(Ready(_))
            .map(album => UpdateCollectionThenUpload(album, files))
        ))
        case _ => noChange
      }
      case Empty =>  effectOnly {
        Effect(Helper.getUserIDFromCookie.map(id => AjaxClient[Api].getUser(id))
          .getOrElse(AjaxClient[Api].createUser).map(Ready(_))
          .map(user => UpdateUserThenUpload(user, files))
        )
      }
      case _ => noChange
    }

    case UpdateUserThenUpload(user, files) =>
      updated(value.copy(user = user), Effect.action(UploadFiles(files)))

    case UpdateCollectionThenUpload(col, files) =>
      updated(value.copy(album = col), Effect.action(UploadFiles(files)))

    case MakePages(photos, index) => effectOnly {
      Effect(AjaxClient[Api].generatePage(value.album.get.id, photos, index)
        .map(p => Ready(List(p))).map(UpdatePages))
    }

    case UpdateAlbum(collection) => updated(value.copy(collection = Ready(collection)))

    case UpdateFromHash(stored) => effectOnly {
      Effect(Future(UpdateAlbum(stored.collection))) >>
      Effect(Future(UpdatePhotos(stored.photos))) >>
      Effect(Future(UpdatePages(Ready(stored.pages))))
    }

    case GetAlbum(hash) => effectOnly {
      Effect(Api.getAlbumFromHash(value.user.map(_.id.get).getOrElse(0), hash).map(s => UpdateFromHash(s)).recover({case ex => None}))
    }

    case GetFromHash => effectOnly {
      Effect(Future(Api.getAlbumHash().map(h => GetAlbum(h))).map(_.getOrElse(None)))
    }

    case SaveAlbum => effectOnly {
      Effect(AjaxClient[Api].saveAlbum(value.album.get))
    }

    case EmailAndSave(email) => effectOnly {
      Effect.action(SaveAlbum) >>
      Effect(Api.emailLink(value.user.get.id.get, email, value.collection.get.hash).map(_ => None))
    }
  }
}


object AppCircuit extends Circuit[RootModel] with ReactConnector[RootModel] {
  override protected var model: RootModel = RootModel()

  override protected def actionHandler = combineHandlers (
    new UserHandler(zoomRW(_.user)((m,v) => m.copy(user = v))),
    new FileUploadHandler(zoomRW(identity)((m,v) => v)),
    new AlbumHandler(zoomRW(_.album)((m,v) => v))
  )
}
