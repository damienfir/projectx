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
import org.scalajs.dom.File


case class UploadState(filesRemaining: List[File] = Nil, index: Int = 0)

case class RootModel(user: Pot[User] = Empty, album: Pot[Album] = Empty, upload: Option[UploadState] = None)


class AlbumHandler[M](modelRW: ModelRW[M, Pot[Album]]) extends ActionHandler(modelRW) {

  def getPage(index: Int) = value.get.pages.find(_.index == index)

  def getPhotos(page: Page): List[Photo] = page.tiles.map(_.photo)
  def getPhotos(index: Int): List[Photo] = getPage(index).get.tiles.map(_.photo)

  def getID(selected: Selected) = value.get.pages(selected.page).tiles(selected.index).photo.id

  def removeOnlyOne(list: List[Photo], condition: Photo => Boolean) = {
    list.indexWhere(condition) match {
      case -1 => list
      case idx => list.take(idx) ++ list.drop(idx+1)
    }
  }

  override def handle = {

    case AddToCover(selected) =>
      effectOnly {
        val photoToAdd = getPhotos(selected.page).filter(_.id == getID(selected))
        Effect {
          AjaxClient[Api].shufflePage(getPage(0).get, getPhotos(0) ++ photoToAdd)
            .call()
            .map(UpdatePages(_))
        }
      }

    case RemoveLastPage =>
      effectOnly {
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
      val photos = removeOnlyOne(getPhotos(selected.page), _.id == getID(selected))
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

    case MovePageLeft(page) =>
      if (page.index < 2) noChange
      else {
        value match {
          case Ready(album) =>
            val pages = album.pages map { p =>
              if (p.index == page.index) p.copy(index = p.index-1)
              else if (p.index == page.index-1) p.copy(index = p.index+1)
              else p
            }
            updated(value.map(album => album.copy(pages = pages).filter))

          case _ => noChange
        }
      }

    case MovePageRight(page) =>
      value match {
        case Ready(album) =>
          if (page.index >= album.pages.length-1) noChange
          else {
            val pages = album.pages map { p =>
              if (p.index == page.index) p.copy(index = p.index + 1)
              else if (p.index == page.index + 1) p.copy(index = p.index - 1)
              else p
            }
            updated(value.map(album => album.copy(pages = pages).filter))
          }
        case _ => noChange
      }
  }
}


case class NewUser(user: Pot[User])
case class AddRemainingPhotos(albumID: Long)
case class NewAlbum(album: Pot[Album])
case class CreateUser()
case class CreateAlbum(userID: Long)


class MainHandler[M](modelRW: ModelRW[M, RootModel]) extends ActionHandler(modelRW) {

  def handle = {

    case NoOp => noChange

    case RequestUpload(index) =>
      updated(value.copy(upload = Some(UploadState(Nil, index))))

    case UploadFiles(files) =>
      val effect = value.user match {
        case Ready(_) =>
          value.album match {
            case Ready(_) =>
              Effect.action(AddRemainingPhotos)
            case Empty =>
              Effect.action(CreateAlbum)
            case _ =>
              Effect.action(NoOp)
          }
        case Empty =>
          Effect.action(CreateUser)
        case _ =>
          Effect.action(NoOp)
      }
      val index = value.upload.map(_.index).getOrElse(0)
      updated(value.copy(upload = Some(UploadState(files, index))), effect)

    case CreateUser =>
      effectOnly {
        Effect(Helper.getUserIDFromCookie
          .map(id => AjaxClient[Api].getUser(id).call())
          .getOrElse(AjaxClient[Api].createUser().call())
          .map(Ready(_))
          .map(user => NewUser(user))
        )
      }

    case NewUser(newUser) =>
      updated(value.copy(user = newUser),
        newUser.map(user => Effect.action(CreateAlbum(user.id)))
          .getOrElse(Effect.action(NoOp)))

    case CreateAlbum(userID) =>
      effectOnly {
        Effect(AjaxClient[Api].createAlbum(userID).call().map(Ready(_))
          .map(album => NewAlbum(album)))
      }

    case NewAlbum(newAlbum) =>
      updated(value.copy(album = newAlbum),
        newAlbum.map(album => Effect.action(AddRemainingPhotos(album.id)))
          .getOrElse(Effect.action(NoOp)))

    case AddRemainingPhotos(albumID) =>
      value.upload match {

        case None => noChange

        case Some(UploadState(Nil, _)) =>
          updated(value.copy(upload = None))

        case Some(UploadState(files, index)) =>
          val pages = value.album.map(_.pages).getOrElse(Nil)
          val updatedIndex = pages match {
            case Nil => index
            case p => if (index == 0) p.length else index
          }

          val (fileSet, rest) =
            if (updatedIndex == 0) (files.take(1), files)
            else files.splitAt(Math.min(new Random().nextInt(3) + 1, files.length))

          val effect = Effect {
            Future.sequence(fileSet.map(f => Helper.uploadFile(f, albumID)))
              .map(photos => MakePages(albumID, photos, updatedIndex))
          } >>
            Effect.action(AddRemainingPhotos(albumID))

          updated(value.copy(upload = Some(UploadState(rest, updatedIndex+1))), effect)

      }

    case MakePages(albumID, photos, index) =>
      effectOnly {
          Effect(AjaxClient[Api].generatePage(albumID, photos, index).call()
          .map(UpdatePages(_)))
      }

    case GetFromCookie => effectOnly {
      Effect(Future(Helper.getUserIDFromCookie.map(GetUser).getOrElse(None))) >>
        Effect.action(GetFromHash)
    }

    case GetAlbum(hash) =>
      effectOnly {
        Effect(AjaxClient[Api].getAlbumFromHash(value.user.map(_.id).getOrElse(0), hash).call().map(UpdateAlbum))
      }

    case GetFromHash =>
      effectOnly {
        Effect(Future(Helper.getAlbumHash().map(h => GetAlbum(h))).map(_.getOrElse(None)))
      }

    case SaveAlbum =>
      effectOnly {
        Effect(AjaxClient[Api].saveAlbum(value.album.get).call())
      }

    case EmailAndSave(email) =>
      effectOnly {
        Effect.action(SaveAlbum) >>
          Effect(AjaxClient[Api].sendLink(value.user.get.id, email, value.album.get.hash).call().map(_ => None))
      }
  }
}


object AppCircuit extends Circuit[RootModel] with ReactConnector[RootModel] {
  override protected var model: RootModel = RootModel()

  override protected def actionHandler = combineHandlers (
    new MainHandler(zoomRW(identity)((m,v) => v)),
    new AlbumHandler(zoomRW(_.album)((m,v) => m.copy(album = v)))
  )
}
