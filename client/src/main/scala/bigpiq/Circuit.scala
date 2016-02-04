package bigpiq.client


import bigpiq.client.components.Selected
import bigpiq.shared._
import diode._
import diode.data.{Empty, Pot, Ready}
import diode.react.ReactConnector

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.util.Random
import autowire._

case class RootModel(user: Pot[User] = Empty, album: Pot[Album] = Empty)


class UserHandler[M](modelRW: ModelRW[M, Pot[User]]) extends ActionHandler(modelRW) {

  override def handle = {
    case UpdateUser(user) => updated(user)
    case GetUser(id) => effectOnly(Effect(AjaxClient[Api].getUser(id).call().map(UpdateUser(_))))
//    case CreateUser => effectOnly(UserApi.createUser())
    case GetFromCookie => effectOnly {
      Effect(Future(Helper.getUserIDFromCookie.map(GetUser).getOrElse(None))) >>
      Effect.action(GetFromHash)
    }
  }
}




class AlbumHandler[M](modelRW: ModelRW[M, Pot[Album]]) extends ActionHandler(modelRW) {

  def getPage(index: Int) = value.get.pages.find(_.index == index)

  def getPhotos(page: Page): List[Photo] = page.tiles.map(_.photo)
  def getPhotos(index: Int): List[Photo] = getPage(index).get.tiles.map(_.photo)

  def getID(selected: Selected) = value.get.pages(selected.page).tiles(selected.index).photo.id


  override def handle = {

    case AddToCover(selected) => effectOnly {
      val photoToAdd = getPhotos(selected.page).filter(_.id == getID(selected))
      Effect(AjaxClient[Api].shufflePage(getPage(0).get, getPhotos(0) ++ photoToAdd).call()
        .map(UpdatePages(_)))
    }

    case RemoveLastPage => effectOnly {
      Effect.action(UpdatePages(value.map(a => List(a.pages.last.copy(tiles = Nil))).getOrElse(Nil)))
    }

    case MoveTile(from, to) => {
      val fromPage = getPage(from.page)
      val fromPhotos = getPhotos(fromPage.get)
      val photoID = getID(from)

      if (to.page == -1)
        if (fromPhotos.length == 1) noChange
        else effectOnly {
          Effect(AjaxClient[Api].shufflePage(fromPage.get, fromPhotos.filter(_.id != photoID)).call().map(UpdatePages(_))) +
            Effect(AjaxClient[Api].generatePage(value.get.id, fromPhotos.filter(_.id == photoID), value.get.pages.length).call().map(UpdatePages(_)))
        } else {
        val toPage = getPage(to.page)
        val toPhotos = getPhotos(toPage.get)

        if (fromPhotos.length == 1) {
          if (from.page == value.get.pages.length - 1) effectOnly {
            Effect(AjaxClient[Api].shufflePage(toPage.get, toPhotos ++ fromPhotos).call().map(UpdatePages(_))) +
              Effect.action(RemoveLastPage)
          } else noChange

        } else effectOnly {
          Effect(AjaxClient[Api].shufflePage(fromPage.get, fromPhotos.filter(_.id != photoID)).call()
            .map(UpdatePages(_))) +
            Effect(AjaxClient[Api].shufflePage(toPage.get, toPhotos ++ fromPhotos.filter(_.id == photoID)).call().map(UpdatePages(_)))
        }
      }
    }

    case ShufflePage(index: Int) => effectOnly {
      val page = getPage(index)
      Effect(AjaxClient[Api].shufflePage(page.get, getPhotos(page.get)).call().map(UpdatePages(_)))
    }

    case RemoveTile(selected) => effectOnly {
      val photos = getPhotos(selected.page).filter(_.id != getID(selected))
      Effect(AjaxClient[Api].shufflePage(value.get.pages(selected.page), photos).call().map(UpdatePages(_)))
    }

    case UpdatePages(pages) => {
      updated(value.map(album =>
        album.copy(pages = album.pages.filter(p => !pages.exists(_.index == p.index)) ++ pages).filter))
    }

    case UpdateAlbum(album) => {
      updated(Ready(album), Effect.action(UpdatePages(album.pages)))
    }

    case UpdateTitle(title) => updated(value.map(_.copy(title=title)))
  }
}


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
        case Empty => effectOnly(Effect(AjaxClient[Api].createAlbum(user.id).call().map(Ready(_))
            .map(album => UpdateCollectionThenUpload(album, files))
        ))
        case _ => noChange
      }
      case Empty =>  effectOnly {
        Effect(Helper.getUserIDFromCookie.map(id => AjaxClient[Api].getUser(id).call())
          .getOrElse(AjaxClient[Api].createUser.call()).map(Ready(_))
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
      Effect(AjaxClient[Api].generatePage(value.album.get.id, photos, index).call()
        .map(UpdatePages(_)))
    }

    case GetAlbum(hash) => effectOnly {
      Effect(AjaxClient[Api].getAlbumFromHash(value.user.map(_.id).getOrElse(0), hash).call().map(UpdateAlbum))
    }

    case GetFromHash => effectOnly {
      Effect(Future(Helper.getAlbumHash().map(h => GetAlbum(h))).map(_.getOrElse(None)))
    }

    case SaveAlbum => effectOnly {
      Effect(AjaxClient[Api].saveAlbum(value.album.get).call())
    }

    case EmailAndSave(email) => effectOnly {
      Effect.action(SaveAlbum) >>
      Effect(AjaxClient[Api].sendLink(value.user.get.id, email, value.album.get.hash).call().map(_ => None))
    }
  }
}


object AppCircuit extends Circuit[RootModel] with ReactConnector[RootModel] {
  override protected var model: RootModel = RootModel()

  override protected def actionHandler = combineHandlers (
    new UserHandler(zoomRW(_.user)((m,v) => m.copy(user = v))),
    new FileUploadHandler(zoomRW(identity)((m,v) => v)),
    new AlbumHandler(zoomRW(_.album)((m,v) => m.copy(album = v)))
  )
}
