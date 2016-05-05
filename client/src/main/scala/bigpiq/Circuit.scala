package bigpiq.client


import bigpiq.client.components.Selected
import bigpiq.shared._
import diode._
import diode.data._
import diode.react.ReactConnector

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.util.Random
import autowire._
import org.scalajs.dom.File


case class UploadState(filesRemaining: List[File] = Nil, index: Int = 0)

case class AlbumPot(id: Long, hash: String, title: String, pages: List[Pot[Page]]) {

  def sort = this.copy(pages = pages.sortBy(_.map(_.index).getOrElse(Int.MaxValue)))

  def filter = this.copy(pages =
    pages.filter(_.map(_.tiles.nonEmpty).getOrElse(true))
  ).sort

  def adjustIndex = this.copy(pages =
    pages.zipWithIndex.map({ case (page, i) => page.map(_.copy(index = i)) }))

  def getAllPhotos: List[Photo] =
    pages.flatMap(p => p.map(_.tiles.map(t => t.photo)).getOrElse(Nil))

  def density: Double = getAllPhotos.length.toDouble / pages.length.toDouble

  def getPhoto(page: Int, tile: Int): Option[Photo] = for {
    potPage <- pages.lift(page)
    page <- potPage.toOption
    tile <- page.tiles.lift(tile)
  } yield tile.photo

  // increment page numbers
  def shiftPagesAfter(page: Int) =
    this.copy(pages =
      pages.take(page + 1) ++
        pages.drop(page + 1).map(_.map(p => p.copy(index = p.index + 1))))

  def nonPot: Album = Album(this.id, this.hash, this.title, this.pages.flatten)

  def allPages: List[Page] = pages.flatten

  def update(newPage: Pot[Page]) =
    this.copy(pages = pages.partition(_.flatMap(a => newPage.map(_.id == a.id)).getOrElse(true)) match {
      case (Nil, rest) => rest.partition(_.isEmpty) match {
        case (Nil, all) => all :+ newPage
        case (emptys, tail) => tail ++ emptys.tail :+ newPage
      }
      case (matching :: tail, rest) => rest :+ newPage
    })

  def invalidate(index: Int) =
    this.copy(pages = pages.map(page => page.flatMap {
      case Page(_, index, _) => page.pending()
      case _ => page
    }))
}

object AlbumPot {
  def apply(album: Album): AlbumPot = AlbumPot(album.id, album.hash, album.title, album.pages.map(Ready(_)))
}


object AlbumConv {
  implicit def potToAlbum(album: AlbumPot): Album = album.nonPot
}


case class RootModel(user: Pot[User] = Empty, album: Pot[AlbumPot] = Empty, upload: Option[UploadState] = None)


class AlbumHandler[M](modelRW: ModelRW[M, Pot[AlbumPot]]) extends ActionHandler(modelRW) {

  def album = value

  def getPage(index: Int): Option[Page] =
    value.toOption.flatMap(_.pages.find(p => p.map(_.index == index).getOrElse(false)).flatMap(_.toOption))

  def getPhotos(index: Int): Option[List[Photo]] =
    getPage(index).map(_.getPhotos)

  def getID(selected: Selected): Option[Long] =
    for {
      pagePot <- album.get.pages.lift(selected.page)
      page <- pagePot.toOption
      tile <- page.tiles.lift(selected.index)
    } yield tile.photo.id

  def removeOnlyOne(list: List[Photo], condition: Photo => Boolean): List[Photo] =
    list.indexWhere(condition) match {
      case -1 => list
      case idx => list.take(idx) ++ list.drop(idx + 1)
    }

  def makeDensityList(photos: List[Photo], targetDensity: Int, variance: Int): List[List[Photo]] =
    List.tabulate(math.ceil(photos.length.toDouble / targetDensity.toDouble).toInt + 8)({
      case 0 => 1
      case _ => new Random().nextInt(variance) + targetDensity - 1
    })
      .scanLeft((0, 0))((acc, a) => (acc._2, acc._2 + a))
      .map({ case (a, b) => photos.slice(a, b) })
      .filterNot(_.isEmpty)

  def makePages(albumID: Long, list: List[List[Photo]]): EffectSeq =
    list.zipWithIndex
      .map({ case (pagePhotos, i) => Effect.action(MakePages(albumID, pagePhotos, i)) })
      .foldLeft(Effect(Future(None)) >> Effect(Future(None)))((a, b) => a >> b)


  override def handle = {

    case AddToCover(selected) =>
      (for {
        photos <- getPhotos(selected.page)
        cover <- getPage(0)
        photoID <- getID(selected)
      } yield {
        val photoToAdd = photos.filter(_.id == photoID)
        Effect {
          AjaxClient[Api].shufflePage(cover, cover.getPhotos ++ photoToAdd)
            .call()
            .map(UpdatePage(_))
        } >>
          Effect.action(SaveAlbum)
      }) map (effectOnly(_)) getOrElse noChange

    case AddToNextPage(selected) =>
      (for {
        album <- value.toOption
        page <- getPage(selected.page)
        photo <- album.getPhoto(selected.page, selected.index)
      } yield {
        val (including, excluding) = page.getPhotos.partition(_.id == photo.id)
        val effect = Effect(AjaxClient[Api].shufflePage(page, excluding).call().map(UpdatePage(_))) +
          Effect(AjaxClient[Api].generatePage(album.id, including, selected.page + 1).call().map(UpdatePage(_))) >>
          Effect.action(SaveAlbum)

        updated(Ready(album.adjustIndex.shiftPagesAfter(selected.page)), effect)
      }) getOrElse noChange

    case ClearPages =>
      updated(value.map(_.copy(pages = Nil)))

    case MoveTile(from, to) =>
      (getPage(from.page), getPage(to.page)) match {
        case (None, _) => noChange
        case (Some(fromPage), toPageOpt) =>
          val fromPhotos = fromPage.getPhotos
          val photoID = getID(from).get

          toPageOpt match {
            // moving to a new page
            case None =>
              effectOnly {
                Effect(AjaxClient[Api].shufflePage(fromPage, fromPhotos.filter(_.id != photoID)).call()
                  .map(UpdatePage(_))) +
                  Effect(AjaxClient[Api].generatePage(album.get.id, fromPhotos.filter(_.id == photoID), album.get.pages.length).call()
                    .map(UpdatePage(_))) >>
                  Effect.action(SaveAlbum)
              }

            // both pages have tiles
            case Some(toPage) =>
              effectOnly {
                Effect(AjaxClient[Api].shufflePage(fromPage, fromPhotos.filter(_.id != photoID)).call()
                  .map(UpdatePage(_))) +
                  Effect(AjaxClient[Api].shufflePage(toPage, toPage.getPhotos ++ fromPhotos.filter(_.id == photoID)).call().map(UpdatePage(_))) >>
                  Effect.action(SaveAlbum)
              }
          }
      }

    case ShufflePage(index: Int) => updated(
      value.map(_.invalidate(index)),
      getPage(index).map(page =>
        Effect(AjaxClient[Api].shufflePage(page, page.getPhotos).call().map(UpdatePage(_))) >>
          Effect.action(SaveAlbum)
      ).getOrElse(Effect(Future(None)))
    )

    case RemoveTile(selected) =>
      (for {
        album <- value.toOption
        photos <- getPhotos(selected.page)
        photoID <- getID(selected)
        page <- album.pages(selected.page).toOption
      } yield {
        effectOnly {
          val photosReduced = removeOnlyOne(photos, _.id == photoID)
          Effect(AjaxClient[Api].shufflePage(page, photosReduced).call().map(UpdatePage(_))) >>
            Effect.action(SaveAlbum)
        }
      }) getOrElse noChange

    case UpdatePage(newPage) =>
      updated(value.map { album =>
        album.update(newPage).filter
      })

    case UpdatePages(newPages) =>
      updated(value.map { album =>
        newPages.foldLeft(album)({ case (a, newPage) => a.update(newPage) })
      })

    case UpdateAlbum(albumPot) =>
      updated(albumPot.map(_.sort))

    case UpdateTitle(title) => updated(value.map(_.copy(title = title)), Effect.action(SaveAlbum))

    case MovePageLeft(page) =>
      value map { album =>
        val (left, right) = album.filter.pages.splitAt(album.pages.indexOf(page) + 1)
        val pages = left.dropRight(2) ++ left.takeRight(2).reverse ++ right
        updated(value.map(album => album.copy(pages = pages).adjustIndex), Effect.action(SaveAlbum))
      } getOrElse noChange

    case MovePageRight(page) =>
      value map { album =>
        val (left, right) = album.filter.pages.splitAt(album.pages.indexOf(page))
        val pages = left ++ right.take(2).reverse ++ right.drop(2)
        updated(value.map(album => album.copy(pages = pages).adjustIndex), Effect.action(SaveAlbum))
      } getOrElse noChange

    case action@(IncreaseDensity | DecreaseDensity) =>
      value map { album =>
        effectOnly {
          val (targetDensity, variance) = action match {
            case IncreaseDensity => (math.ceil(album.density).toInt + 1, 3)
            case DecreaseDensity => (math.max(math.ceil(album.density).toInt - 1, 1), 3)
          }
          Effect.action(ClearPages) >>
            makePages(album.id, makeDensityList(album.getAllPhotos, targetDensity, variance)) >>
            Effect.action(SaveAlbum)
        }
      } getOrElse noChange

    case GeneratePages(photos) =>
      value.map { album =>
        Effect.action(ClearPages) >>
          makePages(album.id, makeDensityList(photos, math.round(album.density).toInt, 3)) >>
          Effect.action(SaveAlbum)
      }.map(effectOnly(_))
        .getOrElse(noChange)

    case OrderByDate =>
      value
        .map(album => AjaxClient[Api].reorderPhotos(album.id).call()
          .map(GeneratePages(_)))
        .map(Effect(_))
        .map(effectOnly)
        .getOrElse(noChange)

    case MakePages(albumID, photos, index) =>
      updated(
        value.map(album => album.copy(pages = album.pages :+ Pot.empty.pending())),
        Effect(AjaxClient[Api].generatePage(albumID, photos, index).call()
          .map(UpdatePage(_)))
      )
  }
}


class UserHandler[M](modelRW: ModelRW[M, Pot[User]]) extends ActionHandler(modelRW) {
  def handle = {
    case UpdateUser(user) => updated(user)

    case GetUser(id) =>
      effectOnly {
        Effect(AjaxClient[Api].getUser(id).call().map(u => UpdateUser(Ready(u))))
      }
  }
}


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
        Effect.action(UpdateAlbum(newAlbum.map(AlbumPot(_)))) +
          newAlbum.map(album => {
            Effect.action(AddRemainingPhotos(album.id)) +
              Effect(Future(Helper.updateUrl(album.hash)).map(_ => None))
          })
            .getOrElse(Effect.action(NoOp))
      }

    case AddRemainingPhotos(albumID) =>
      value match {
        case None => noChange
        case Some(UploadState(Nil, _)) => noChange

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
}


class MainHandler[M](modelRW: ModelRW[M, RootModel]) extends ActionHandler(modelRW) {

  import AlbumConv._

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
          .map(a => UpdateAlbum(Ready(AlbumPot(a)))))
      }

    case GetFromHash =>
      effectOnly {
        Effect(Future(Helper.getAlbumHash().map(h => GetAlbum(h))).map(_.getOrElse(None)))
      }

    case SaveAlbum =>
      value.album
        .map(_.adjustIndex)
        .filterNot(_.pages.isEmpty)
        .map { album =>
          updated(value.copy(album = Ready(album)),
            Effect(AjaxClient[Api].saveAlbum(album).call()))
        }
        .getOrElse(noChange)

    case EmailAndSave(email) =>
      value.user flatMap { user: User =>
        value.album map { album: AlbumPot =>
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
