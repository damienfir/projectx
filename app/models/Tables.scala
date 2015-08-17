package models

import slick.driver.PostgresDriver.api._
import play.api.libs.json._

import DB._


object Tables {

  implicit val tilesColumnType = MappedColumnType.base[List[Tile], String] (
    { item => Json.stringify(Json.toJson(item))},
    { json => Json.parse(json).as[List[Tile]]}
  )

  class Users(tag: Tag) extends Table[User](tag, "users") {
    def id = column[Long]("id", O.PrimaryKey, O.AutoInc)
    def email = column[String]("email")
    def * = (id.?, email.?) <> (User.tupled, User.unapply)
  }
  val users = TableQuery[Users]


  class Collections(tag: Tag) extends Table[Collection](tag, "collections") {
    def id = column[Long]("id", O.PrimaryKey, O.AutoInc)
    def name = column[String]("name")
    def * = (id.?, name.?) <> (Collection.tupled, Collection.unapply)
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
    def tiles = column[List[Tile]]("tiles")
    def * = (id.?, collectionID, tiles) <> (Composition.tupled, Composition.unapply)
  }


  class UserCollectionRelations(tag: Tag) extends Table[(Long,Long)](tag, "usercollectionrelations") {
    def userID = column[Long]("user_id")
    def collectionID = column[Long]("collection_id")
    def * = (userID, collectionID)
    def user = foreignKey("user_fk", userID, users)(_.id)
    def collection = foreignKey("collection_fk", collectionID, collections)(_.id)
  }
  val usercollectionrelations = TableQuery[UserCollectionRelations]
}
