package models

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
import bigpiq.shared._
import Tables._



@Singleton
class UsersDAO @Inject()(protected val dbConfigProvider: DatabaseConfigProvider) extends HasDatabaseConfigProvider[JdbcProfile] {
  def one(id: Long) = users.filter(_.id === id)

  def get(id: Long) = db.run(one(id).result).map(_.headOption)
  def list = db.run(users.result)
  def update(item: User) = db.run(one(item.id.get).update(item).asTry)
  def insert(item: User) = db.run((users returning users) += item)
  def delete(id: Long) = dbConfig.db.run(one(id).delete)
}


@Singleton
class CollectionDAO @Inject()(protected val dbConfigProvider: DatabaseConfigProvider, usersDAO: UsersDAO) extends HasDatabaseConfigProvider[JdbcProfile] {

  def get(id: Long) = db.run(collections.filter(_.id === id).result) map (_.headOption)

  def update(collection: Collection) = db.run {
    collections.filter(_.id === collection.id.get).update(collection)
  }

  def withUser(id: Long): Future[Collection] =
    // for {
    // u <- db.run(users.one(id).result)
    // c <- db.run(collections.returning(collections) += Collection(None, None, UUID.randomUUID.toString))
    // r <- db.run(usercollectionrelations += (u.get.id.get, c.id.get))
  // } yield c

    db.run(usersDAO.one(id).result) map (_.headOption) flatMap {
      case Some(u) => db.run((collections returning collections) += Collection(None, None, UUID.randomUUID.toString)) flatMap { c =>
        db.run(usercollectionrelations += (u.id.get, c.id.get)) map (_ => c)
      }
      case None => throw new Exception
    }
  

  def fromUserQuery(id: Long) = for {
    r <- usercollectionrelations.filter(_.userID === id) if usersDAO.one(id).exists
    c <- collections if c.id === r.collectionID
  } yield (c)

  def fromUser(id: Long) = db.run(fromUserQuery(id).result)

  def getByHash(userID: Long, hash: String) : Future[Collection] = {
    val query = for {
      // r <- usercollectionrelations.filter(_.userID === userID)
      col <- collections if (col.hash === hash)// && col.id === r.collectionID)
    } yield col
    db.run(query.result) map (_.head)
  }
}


@Singleton
class PhotoDAO @Inject()(protected val dbConfigProvider: DatabaseConfigProvider, collectionDAO: CollectionDAO) extends HasDatabaseConfigProvider[JdbcProfile] {
  def get(id: Long) = db.run(photos.filter(_.id === id).result).map(_.head)

  def addToCollection(id: Long, photo: Photo) =
    db.run(collections.filter(_.id === id).result).map(_.head) flatMap { col =>
      db.run((photos returning photos) += photo.copy(collectionID = col.id.get))
    }

  def allFromCollection(id: Long) = db.run(photos.filter(_.collectionID === id).result)
}


@Singleton
class CompositionDAO @Inject()(protected val dbConfigProvider: DatabaseConfigProvider, collectionDAO: CollectionDAO) extends HasDatabaseConfigProvider[JdbcProfile] {

  def get(id: Long) = db.run(compositions.filter(_.id === id).result).map(_.head)

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

  def allFromCollection(id: Long) = db.run(compositions.filter(_.collectionID === id).result) map (_.sortBy(_.index))

  def addWithCollection(id: Long): Future[Composition] = for {
    col <- collectionDAO.get(id)
    comp <- db.run((compositions returning compositions) += Composition(None, col.get.id.get, 0, List()))
  } yield comp

  def update(comp: Composition): Future[Composition] = db.run {
      compositions.filter(_.id === comp.id.get).update(comp).asTry
    } map {
      case Success(_) => comp
      case Failure(_) => throw new Exception
    }
}
