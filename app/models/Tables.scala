package models

import com.github.tminglei.slickpg._
import slick.driver.PostgresDriver
import play.api.libs.json._


import DBModels._


trait PostgresDriverExt extends PostgresDriver with PgPlayJsonSupport {
  override val api = APIExt
  def pgjson = "jsonb"

  object APIExt extends API with JsonImplicits {

    implicit val tilesColumnType = MappedColumnType.base[List[Tile], JsValue] (
      { item => Json.toJson(item)},
      { json => json.as[List[Tile]]}
    )

    implicit val listColumnType = MappedColumnType.base[List[String], JsValue] (
      { items => Json.toJson(items)},
      { json => json.as[List[String]]}
    )
  }
}

object PostgresDriverExt extends PostgresDriverExt


object Tables {
  import PostgresDriverExt.api._

  class Users(tag: Tag) extends Table[User](tag, "users") {
    def id = column[Long]("id", O.PrimaryKey, O.AutoInc)
    def email = column[String]("email")
    def * = (id.?, email.?) <> (User.tupled, User.unapply)
  }
  val users = TableQuery[Users]


  class Collections(tag: Tag) extends Table[Collection](tag, "collections") {
    def id = column[Long]("id", O.PrimaryKey, O.AutoInc)
    def name = column[String]("name")
    def hash = column[String]("hash")
    def * = (id.?, name.?, hash) <> (Collection.tupled, Collection.unapply)
  }
  val collections = TableQuery[Collections]


  class Photos(tag: Tag) extends Table[Photo](tag, "photos") {
    def id = column[Long]("id", O.PrimaryKey, O.AutoInc)
    def collectionID = column[Long]("collection_id")
    def hash = column[String]("hash")
    def * = (id.?, collectionID, hash) <> (Photo.tupled, Photo.unapply)
  }
  val photos = TableQuery[Photos]


  class Compositions(tag: Tag) extends Table[Composition](tag, "compositions") {
    def id = column[Long]("id", O.PrimaryKey, O.AutoInc)
    def collectionID = column[Long]("collection_id")
    def index = column[Int]("index")
    def tiles = column[List[Tile]]("tiles")
    def * = (id.?, collectionID, index, tiles) <> (Composition.tupled, Composition.unapply)
  }
  val compositions = TableQuery[Compositions]


  class UserCollectionRelations(tag: Tag) extends Table[(Long,Long)](tag, "usercollectionrelations") {
    def userID = column[Long]("user_id")
    def collectionID = column[Long]("collection_id")
    def * = (userID, collectionID)
    def user = foreignKey("user_fk", userID, users)(_.id)
    def collection = foreignKey("collection_fk", collectionID, collections)(_.id)
  }
  val usercollectionrelations = TableQuery[UserCollectionRelations]
}
