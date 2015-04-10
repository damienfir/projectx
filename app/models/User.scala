package models;

import anorm._
import play.api.Play.current
import play.api.db.DB


case class User(id: Option[Long], name: String)

object UserModel {

  def generateNew: User = DB.withConnection { implicit c =>
    val id = SQL("INSERT INTO users (name) VALUES ('')").executeInsert()
    User(id, "")
  }

  def getOrCreateFromSession(uid: Option[String]): User = getFromSession(uid) match {
    case Some(user) => user
    case None => generateNew
  }

  def getFromSession(uid: Option[String]): Option[User] =
    uid flatMap { id =>
      DB.withConnection { implicit c =>
        SQL("SELECT * FROM users WHERE id={id}").on("id" -> id.toLong).apply().headOption
      }
    } map {
      user => User(Some(user[Long]("id")), user[String]("name"))
    }

    def addEmail(email: String)(implicit user: User) = DB.withConnection { implicit c =>
      SQL("UPDATE users SET email={email} WHERE id={id}").on("email"-> email, "id" -> user.id).executeUpdate();
    }
}
