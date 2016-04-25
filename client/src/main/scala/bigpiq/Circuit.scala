package bigpiq.client


import bigpiq.client.components.Selected
import bigpiq.shared._
import diode._
import diode.data.{Empty, Pot, PotAction, Ready}
import diode.react.ReactConnector

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.util.Random
import autowire._
import org.scalajs.dom.File


case class UploadState(filesRemaining: List[File] = Nil, index: Int = 0)

case class RootModel(user: Pot[User] = Empty, album: Pot[Album] = Empty, upload: Option[UploadState] = None)


class AlbumHandler[M](modelRW: ModelRW[M, Pot[Album]]) extends ActionHandler(modelRW) {
  def album = value

  def getPage(index: Int): Option[Page] = value.map(_.pages.find(_.index == index)).getOrElse(None)

  def getPhotos(page: Page): List[Photo] = page.tiles.map(_.photo)

  def getPhotos(index: Int): List[Photo] = getPage(index).get.tiles.map(_.photo)

  def getID(selected: Selected) = album.get.pages(selected.page).tiles(selected.index).photo.id

  def removeOnlyOne(list: List[Photo], condition: Photo => Boolean) = {
    list.indexWhere(condition) match {
      case -1 => list
      case idx => list.take(idx) ++ list.drop(idx + 1)
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
        Effect.action(UpdatePages(
          value.map(a => List(a.pages.last.copy(tiles = Nil))).getOrElse(Nil)
        ))
      }

    case MoveTile(from, to) =>
      (getPage(from.page), getPage(to.page)) match {
        case (None, _) => noChange
        case (Some(fromPage), toPageOpt) =>
          val fromPhotos = getPhotos(fromPage)
          val photoID = getID(from)

          toPageOpt match {
            case None =>
              effectOnly {
                Effect(AjaxClient[Api].shufflePage(fromPage, fromPhotos.filter(_.id != photoID)).call().map(UpdatePages(_))) +
                  Effect(AjaxClient[Api].generatePage(album.get.id, fromPhotos.filter(_.id == photoID), album.get.pages.length).call().map(UpdatePages(_)))
              }

            case Some(toPage) =>
              val toPhotos = getPhotos(toPage)
              effectOnly {
                Effect(AjaxClient[Api].shufflePage(fromPage, fromPhotos.filter(_.id != photoID)).call()
                  .map(UpdatePages(_))) +
                  Effect(AjaxClient[Api].shufflePage(toPage, toPhotos ++ fromPhotos.filter(_.id == photoID)).call().map(UpdatePages(_)))
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

    case UpdateAlbum(albumPot) =>
      albumPot map { album: Album =>
        updated(albumPot, Effect.action(UpdatePages(album.pages)))
      } getOrElse noChange

    case UpdateTitle(title) => updated(value.map(_.copy(title = title)))

    case MovePageLeft(page) =>
      value match {
        case Ready(album) =>
          val (left, right) = album.filter.pages.splitAt(album.pages.indexOf(page) + 1)
          //            val pages = left.drop(1) ++ right.take(1) ++ left.takeRight(1) ++ right.drop(1)
          val pages = left.dropRight(2) ++ left.takeRight(2).reverse ++ right
          updated(value.map(album => album.copy(pages = pages).updateIndex()))

        case _ => noChange
      }

    case MovePageRight(page) =>
      value match {
        case Ready(album) =>
          val (left, right) = album.filter.pages.splitAt(album.pages.indexOf(page))
          val pages = left ++ right.take(2).reverse ++ right.drop(2)
          updated(value.map(album => album.copy(pages = pages).updateIndex()))

        case _ => noChange
      }
  }
}


class UserHandler[M](modelRW: ModelRW[M, Pot[User]]) extends ActionHandler(modelRW) {
  def handle = {
    case UpdateUser(user) => updated(user)
  }
}


case class NewUser(user: Pot[User])

case class AddRemainingPhotos(albumID: Long)

case class NewAlbum(album: Pot[Album])

case class CreateUser()

case class CreateAlbum(userID: Long)


class UploadHandler[M](modelRW: ModelRW[M, Option[UploadState]]) extends ActionHandler(modelRW) {
  def handle = {
    case NoOp => noChange

    case RequestUploadAfter(index) =>
      updated(Some(UploadState(Nil, index)))

    case CancelUploadRequest =>
      updated(None)

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
      effectOnly {
        Effect.action(UpdateUser(newUser)) +
          newUser.map(user => Effect.action(CreateAlbum(user.id)))
            .getOrElse(Effect.action(NoOp))
      }

    case CreateAlbum(userID) =>
      effectOnly {
        Effect(AjaxClient[Api].createAlbum(userID).call()
          .map(Ready(_))
          .map(album => NewAlbum(album)))
      }

    case NewAlbum(newAlbum) =>
      effectOnly {
        Effect.action(UpdateAlbum(newAlbum)) +
          newAlbum.map(album => {
            Effect.action(AddRemainingPhotos(album.id)) +
              Effect(Future(Helper.updateUrl(album.hash)).map(_ => None))
          })
            .getOrElse(Effect.action(NoOp))
      }

    case AddRemainingPhotos(albumID) => {
      //      println(value)
      value match {

        case None => noChange

        case Some(UploadState(Nil, _)) =>
          noChange

        case Some(UploadState(files, index)) =>
          val (fileSet, rest) =
            if (index == 0) files.splitAt(1)
            else files.splitAt(Math.min(new Random().nextInt(3) + 1, files.length))

          val effect =
            Effect {
              Future.sequence(fileSet.map(f => Helper.uploadFile(f, albumID)))
                .map(photos => MakePages(albumID, photos, index))
            } >>
              Effect.action(AddRemainingPhotos(albumID))

          updated(Some(UploadState(rest, index + 1)), effect)
      }
    }

    case MakePages(albumID, photos, index) =>
      effectOnly {
        Effect(AjaxClient[Api].generatePage(albumID, photos, index).call()
          .map(UpdatePages(_)))
      }

  }
}


class MainHandler[M](modelRW: ModelRW[M, RootModel]) extends ActionHandler(modelRW) {

  def handle = {

    case UploadFiles(files) =>
      val effect = value.user match {
        case Ready(user) =>
          value.album match {
            case Ready(album) =>
              Effect.action(AddRemainingPhotos(album.id))
            case Empty =>
              Effect.action(CreateAlbum(user.id))
            case _ =>
              Effect.action(NoOp)
          }
        case Empty =>
          Effect.action(CreateUser)
        case _ =>
          Effect.action(NoOp)
      }
      val up = value.upload.map(s => s.copy(filesRemaining = files, index = if (s.index == 0) value.album.map(_.pages.length).getOrElse(0) else s.index))
      updated(value.copy(upload = up), effect)

    case GetFromCookie =>
      effectOnly {
        Effect(Future(Helper.getUserIDFromCookie.map(GetUser).getOrElse(None))) >>
          Effect.action(GetFromHash)
      }

    case GetAlbum(hash) =>
      effectOnly {
        Effect(AjaxClient[Api].getAlbumFromHash(value.user.map(_.id).getOrElse(0), hash).call()
          .map(a => UpdateAlbum(Ready(a))))
      }

    case GetFromHash =>
      effectOnly {
        Effect(Future(Helper.getAlbumHash().map(h => GetAlbum(h))).map(_.getOrElse(None)))
      }

    case SaveAlbum =>
      value.album map { album =>
        effectOnly {
          Effect(AjaxClient[Api].saveAlbum(album).call())
        }
      } getOrElse noChange

    case EmailAndSave(email) =>
      value.user flatMap { user: User =>
        value.album map { album: Album =>
          effectOnly {
            Effect.action(SaveAlbum) >>
              Effect(AjaxClient[Api].sendLink(user.id, email, album.hash).call().map(_ => None))
          }
        }
      } getOrElse noChange
  }
}

class LoggingProcessor[M <: AnyRef] extends ActionProcessor[M] {
  def process(dispatch: Dispatcher, action: AnyRef, next: (AnyRef) => ActionResult[M], currentModel: M): ActionResult[M] = {
    // log the action
    println(System.currentTimeMillis(), action.toString)
    // call the next processor
    next(action)
  }
}

object AppCircuit extends Circuit[RootModel] with ReactConnector[RootModel] {
  override protected var model: RootModel = RootModel()

  override protected def actionHandler = combineHandlers(
    new MainHandler(zoomRW(identity)((m, v) => v)),
    new UploadHandler(zoomRW(_.upload)((m, v) => m.copy(upload = v))),
    new UserHandler(zoomRW(_.user)((m, v) => m.copy(user = v))),
    new AlbumHandler(zoomRW(_.album)((m, v) => m.copy(album = v)))
  )
}
