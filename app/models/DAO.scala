package models

import scala.util.{Try, Success, Failure}
import javax.inject._
import scala.concurrent.Future
import play.api.db.slick.DatabaseConfigProvider
import play.api.db.slick.HasDatabaseConfigProvider
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import slick.driver.JdbcProfile
import slick.driver.PostgresDriver.api._
import slick.backend.DatabaseConfig

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
