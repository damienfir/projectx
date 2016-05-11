package bigpiq.server.db

import slick.driver.PostgresDriver

import upickle.default._


object Tables {
  import PostgresDriver.api._

  implicit val tilesColumnType = MappedColumnType.base[List[Tile], String](
    { item => write(item)},
    { obj => read[List[Tile]](obj)}
  )

  class Users(tag: Tag) extends Table[User](tag, "users") {
    def id = column[Option[Long]]("id", O.PrimaryKey, O.AutoInc)
    def email = column[Option[String]]("email")
    def * = (id, email) <> (User.tupled, User.unapply)
  }
  val users = TableQuery[Users]


  class Collections(tag: Tag) extends Table[Collection](tag, "collections") {
    def id = column[Option[Long]]("id", O.PrimaryKey, O.AutoInc)
    def name = column[Option[String]]("name")
    def hash = column[String]("hash")
    def bookmodel = column[Int]("bookmodel")
    def * = (id, name, hash, bookmodel) <> (Collection.tupled, Collection.unapply)
  }
  val collections = TableQuery[Collections]


  class Photos(tag: Tag) extends Table[Photo](tag, "photos") {
    def id = column[Option[Long]]("id", O.PrimaryKey, O.AutoInc)
    def collectionID = column[Long]("collection_id")
    def hash = column[String]("hash")
    def data = column[Array[Byte]]("data")
    def * = (id, collectionID, hash, data) <> (Photo.tupled, Photo.unapply)
  }
  val photos = TableQuery[Photos]


  class Compositions(tag: Tag) extends Table[Composition](tag, "compositions") {
    def id = column[Option[Long]]("id", O.PrimaryKey, O.AutoInc)
    def collectionID = column[Long]("collection_id")
    def index = column[Int]("index")
    def tiles = column[List[Tile]]("tiles")
    def * = (id, collectionID, index, tiles) <> (Composition.tupled, Composition.unapply)
  }
  val compositions = TableQuery[Compositions]


  class UserCollectionRelations(tag: Tag) extends Table[(Long,Long)](tag, "usercollectionrelations") {
    def userID = column[Long]("user_id")
    def collectionID = column[Long]("collection_id")
    def * = (userID, collectionID)
    def user = foreignKey("user_fk", userID, users)(_.id.get)
    def collection = foreignKey("collection_fk", collectionID, collections)(_.id.get)
  }
  val usercollectionrelations = TableQuery[UserCollectionRelations]
}
