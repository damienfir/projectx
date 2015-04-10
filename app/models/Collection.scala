package models;

import anorm._
import play.api.libs.Files.TemporaryFile
import scala.util.{Try, Success, Failure}
import play.api.libs.json._
import play.api.Play
import play.api.Play.current
import play.api.db.DB


case class Collection(id: Option[Long], hash: String)

object CollectionModel {
  type T = Collection

  def default = Collection(None, "")

  def generateNew(implicit user: User): T = DB.withConnection { implicit c =>
    val id = SQL("INSERT INTO collections (hash) VALUES ('')").executeInsert()
    SQL(s"INSERT INTO users_collections VALUES ({uid}, {cid})").on("uid" -> user.id.get, "cid" -> id).execute()
    Collection(id, "")
  }

  def getFromSession(col: Option[String]): Option[Collection] = col map { collection =>
    Collection(Some(collection.toLong), "")
  }

  def addToCollection(filenames: List[String])(implicit collection: Collection) = DB.withConnection { implicit c =>
    val ids = filenames map { f =>
      SQL("INSERT INTO photos (hash) VALUES ({hash})").on("hash" -> f).executeInsert()
    }
    ids map { pid =>
      SQL("INSERT INTO collections_photos VALUES ({cid}, {pid})").on(
        "cid" -> collection.id.get, "pid" -> pid
      ).execute()
    }
  }

  def addImages(newImages: List[TemporaryFile])(implicit collection: Collection) = {
    val hashList = newImages.filter(_.file.length > 4).map(ImageModel.save(_)).filter(_.isSuccess).map(_.get)
    addToCollection(hashList)
  }

  def getImagePaths(implicit collection: Collection): List[String] = DB.withConnection { implicit c =>
    SQL("""
      SELECT * FROM photos
      INNER JOIN collections_photos ON collections_photos.photo_id = photos.id
      WHERE collections_photos.collection_id = {cid}
      """).on("cid" -> collection.id.get).apply().map(
        item => ImageModel.fullPath(item[String]("hash"))
      ).toList
  }
}
