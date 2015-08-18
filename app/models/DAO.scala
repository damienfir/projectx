package models

import scala.util.{Try, Success, Failure}
import javax.inject._
import scala.concurrent.Future
import play.api.db.slick.DatabaseConfigProvider
import play.api.db.slick.HasDatabaseConfigProvider
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import slick.driver.JdbcProfile
import slick.backend.DatabaseConfig

import PostgresDriverExt.api._
import DB._
import Tables._


object Queries {
  implicit class QueryExtensions(val q: Query[Users, User, Seq]) {
    def one(id: Long) = q.filter(_.id === id)
  }

}


@Singleton
class UsersDAO @Inject()(protected val dbConfigProvider: DatabaseConfigProvider) extends HasDatabaseConfigProvider[JdbcProfile] {
  import Queries._

  def get(id: Long) = db.run(users.one(id).result).map(_.headOption)
  def list = db.run(users.result)
  def update(item: User) = db.run(users.one(item.id.get).update(item).asTry)
  def insert(item: User) = db.run((users returning users) += item)
  def delete(id: Long) = dbConfig.db.run(users.one(id).delete)
}


@Singleton
class CollectionDAO @Inject()(protected val dbConfigProvider: DatabaseConfigProvider) extends HasDatabaseConfigProvider[JdbcProfile] {
  import Queries._

  def get(id: Long) = db.run(collections.filter(_.id === id).result) map (_.headOption)

  def withUser(id: Long): Future[Option[Collection]] =
    db.run(users.one(id).result) map (_.headOption) flatMap {
      case Some(u) => db.run((collections returning collections) += Collection(None, None)) flatMap { c =>
        db.run(usercollectionrelations += (u.id.get, c.id.get)) map (_ => Some(c))
      }
      case None => Future(None)
    }

  def fromUserQuery(id: Long) = for {
    r <- usercollectionrelations.filter(_.userID === id) if users.one(id).exists
    c <- collections if c.id === r.collectionID
  } yield (c)

  def fromUser(id: Long) = db.run(fromUserQuery(id).result)
}


@Singleton
class PhotoDAO @Inject()(protected val dbConfigProvider: DatabaseConfigProvider, collectionDAO: CollectionDAO) extends HasDatabaseConfigProvider[JdbcProfile] {
  def addToCollection(id: Long, hash: Seq[String]) =
    db.run(collections.filter(_.id === id).result).map(_.headOption) flatMap {
      case Some(col: Collection) => db.run((photos returning photos) ++= hash.map(Photo(None, col.id.get, _))) map (Some(_))
      case None => Future(None)
    }

  def allFromCollection(id: Long) = db.run(photos.filter(_.collectionID === id).result)
}


@Singleton
class CompositionDAO @Inject()(protected val dbConfigProvider: DatabaseConfigProvider, collectionDAO: CollectionDAO) extends HasDatabaseConfigProvider[JdbcProfile] {

  def addWithCollection(id: Long): Future[Composition] = for {
    col <- collectionDAO.get(id)
    comp <- db.run((compositions returning compositions) += Composition(None, col.get.id.get, List(), List()))
  } yield comp

  def update(comp: Composition): Future[Composition] = db.run {
      compositions.filter(_.id === comp.id.get).update(comp).asTry
    } map {
      case Success(_) => comp
      case Failure(_) => throw new Exception
    }
}
