package bigpiq.server.db

import scala.util.{Try, Success, Failure}
import javax.inject._
import scala.concurrent.Future
import play.api.db.slick.DatabaseConfigProvider
import play.api.db.slick.HasDatabaseConfigProvider
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import slick.driver.JdbcProfile
import slick.backend.DatabaseConfig
import java.util.UUID

import slick.driver.PostgresDriver.api._
import bigpiq.shared


trait HasID{
  def id: Option[Long]
}

case class User (
  id: Option[Long] = None,
  email: Option[String] = None
) extends HasID {
  def export: shared.User = shared.User(id.get, email.getOrElse(""), Nil)
//  def export(collection: Collection): shared.User =
//    export.copy(albums=List(collection.export))
}

case class Collection (
  id: Option[Long],
  name: Option[String],
  hash: String
) {
  def export: shared.Album = shared.Album(id.get, hash, name.get, Nil)
}
object Collection {
  def from(album: shared.Album): Collection = Collection(Some(album.id), Some(album.title), album.hash)
  def tupled = (Collection.apply _).tupled
}

case class Photo (
  id: Option[Long],
  collectionID: Long,
  hash: String,
  data: Array[Byte]
) {
  def export: shared.Photo = shared.Photo(id.get, hash)
}

case class Composition (
  id: Option[Long],
  collectionID: Long,
  index: Int,
  tiles: List[Tile]
) {
  def export: shared.Page = shared.Page(id.get, index, Nil)
}
object Composition {
  def from(album: shared.Album): List[Composition] =
    album.pages.map(p => from(album.id, p))
  def from(albumID: Long, page: shared.Page): Composition =
    Composition(Some(page.id), albumID, page.index, page.tiles.map(Tile.from))
  def tupled = (Composition.apply _).tupled
}

case class Tile(
  photoID: Long,
  rot: Option[Int],
  cx1: Float,
  cx2: Float,
  cy1: Float,
  cy2: Float,
  tx1: Float,
  tx2: Float,
  ty1: Float,
  ty2: Float
) {
//  def export: shared.Tile = shared.Tile()
}
object Tile {
  def from(tile: shared.Tile): Tile = Tile(tile.photo.id, Some(tile.rot),
    tile.cx1, tile.cx2, tile.cy1, tile.cy2, tile.tx1, tile.tx2, tile.ty1, tile.ty2
  )
}


import Tables._

@Singleton
class UsersDAO @Inject()(protected val dbConfigProvider: DatabaseConfigProvider) extends HasDatabaseConfigProvider[JdbcProfile] {
  def one(id: Long) = users.filter(_.id === id)

  def get(id: Long) = db.run(one(id).result).map(_.head).map(_.export)
  def insert = db.run((users returning users) += User()).map(_.export)
  // def list = db.run(users.result)
  // def update(item: User) = db.run(one(item.id.get).update(item).asTry)
  // def delete(id: Long) = dbConfig.db.run(one(id).delete)
}


@Singleton
class CollectionDAO @Inject()(protected val dbConfigProvider: DatabaseConfigProvider, usersDAO: UsersDAO) extends HasDatabaseConfigProvider[JdbcProfile] {

   def getCollection(id: Long) = db.run(collections.filter(_.id === id).result) map (_.head)

  def makeHash = UUID.randomUUID.toString

  def update(album: shared.Album): Future[shared.Album] = {
    val (collection, comps) = (Collection.from(album), Composition.from(album))
    for {
      col <- db.run(collections.filter(_.id === collection.id).update(collection))
      comp <- updateAll(comps)
      _ <- removeUnused(collection, comps)
    } yield album
  }

  def updateAll(comps: List[Composition]) = Future.sequence {
    comps.map(comp => db.run(compositions.returning(compositions).insertOrUpdate(comp)))
  }

  def removeUnused(collection: Collection, comps: List[Composition]) = {
    db.run(compositions.filter(_.collectionID === collection.id).result) flatMap { allcomp =>
      Future.sequence {
        allcomp.filter(c => !comps.map(_.id).contains(c.id))
          .map(c => compositions.filter(_.id === c.id).delete)
          .map(db.run(_))
      }
    }
  }

  def withUser(id: Long): Future[shared.Album] =
    // for {
    // u <- db.run(users.one(id).result)
    // c <- db.run(collections.returning(collections) += Collection(None, None, UUID.randomUUID.toString))
    // r <- db.run(usercollectionrelations += (u.get.id.get, c.id.get))
  // } yield c

  db.run(usersDAO.one(id).result) map (_.head) flatMap { u =>
      db.run((collections returning collections) += Collection(None, None, makeHash)) flatMap { c =>
        db.run(usercollectionrelations += (u.id.get, c.id.get)) map (_ => c.export)
      }
    }


  def addPage(albumID: Long): Future[shared.Page] = for {
    col <- getCollection(albumID)
    comp <- db.run((compositions returning compositions) += Composition(None, col.id.get, 0, Nil))
  } yield comp.export

  def updatePage(albumID: Long, page: shared.Page): Future[shared.Page] = db.run {
    val comp = Composition.from(albumID, page)
    compositions.filter(_.id === comp.id.get).update(comp)
  } map (_ => page)

  // def fromUserQuery(id: Long) = for {
  //   r <- usercollectionrelations.filter(_.userID === id) if usersDAO.one(id).exists
  //   c <- collections if c.id === r.collectionID
  // } yield (c)

  // def fromUser(id: Long) = db.run(fromUserQuery(id).result)

  def getByHash(userID: Long, hash: String) : Future[shared.Album] = {
    val query = for {
      // r <- usercollectionrelations.filter(_.userID === userID)
      col <- collections if col.hash === hash// && col.id === r.collectionID)
    } yield col
    db.run(query.result) map (_.head) map (_.export)
  }
}


@Singleton
class PhotoDAO @Inject()(protected val dbConfigProvider: DatabaseConfigProvider, collectionDAO: CollectionDAO) extends HasDatabaseConfigProvider[JdbcProfile] {
  def get(id: Long) = db.run(photos.filter(_.id === id).result).map(_.head)

  def addToCollection(id: Long, hash: String, data: Array[Byte]): Future[shared.Photo] =
    db.run(collections.filter(_.id === id).result).map(_.head) flatMap { col =>
      db.run((photos returning photos) += Photo(None, col.id.get, hash, data))
        .map(_.export)
    }

  def allFromCollection(id: Long) = db.run(photos.filter(_.collectionID === id).result)
}


@Singleton
class CompositionDAO @Inject()(protected val dbConfigProvider: DatabaseConfigProvider, collectionDAO: CollectionDAO) extends HasDatabaseConfigProvider[JdbcProfile] {

  def get(id: Long) = db.run(compositions.filter(_.id === id).result).map(_.head)

  def allFromCollection(id: Long) = db.run(compositions.filter(_.collectionID === id).result) map (_.sortBy(_.index))

//  def addWithCollection(id: Long): Future[Composition] = for {
//    col <- collectionDAO.get(id)
//    comp <- db.run((compositions returning compositions) += Composition(None, col.get.id.get, 0, List()))
//  } yield comp
//
//  def update(comp: Composition): Future[Composition] = db.run {
//      compositions.filter(_.id === comp.id.get).update(comp).asTry
//    } map {
//      case Success(_) => comp
//      case Failure(_) => throw new Exception
//    }
}
