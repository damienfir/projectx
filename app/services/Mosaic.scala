package services

import scala.util.{Try, Success, Failure}
import scala.concurrent.Future
import scala.io.Source
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import scala.sys.process._
import play.api.libs.json._
import play.api.Play
import play.api.libs.Files.TemporaryFile
import java.io.File

import models._


case class Cluster(
  gists: List[String],
  sorted: List[Int]
)

object MosaicService {
  implicit val clusterFormat = Json.format[Cluster]
  implicit val tileFormat = Json.format[Tile]

  val binary = Play.current.configuration.getString("px.binary").get

  // def genericFile(path: String) = id => s"$path/$id"
  
  def getMosaicFile(filename: String) = new File(mosaicFile(filename))

  def mosaicFile(id: String) = Play.current.configuration.getString("px.dir_generated").get + s"/$id"
  def photoFile(id: String) = Play.current.configuration.getString("px.dir_photos").get + s"/$id"

  def gistFile(id: String) = Play.current.configuration.getString("px.dir_gist").get + s"/$id"
  def clusterFile(id: String) = Play.current.configuration.getString("px.dir_clusters").get + s"/$id"
  def matchFile(id: String) = Play.current.configuration.getString("px.dir_match").get + s"/$id"
  def tileFile(id: String) = Play.current.configuration.getString("px.dir_tile").get + s"/$id"


  def preprocess(filenames: List[String]) = filenames map { filename =>
    val cmd = Seq(binary, "--preprocess", photoFile(filename), gistFile(filename))
    cmd.!
    println(cmd)
  }

  def cluster(gists: List[String], id: String): Option[Cluster] = {
    val out = clusterFile(id)
    val cmd = binary +: "--cluster" +: gists.length.toString +: gists.map(gistFile) :+ out
    println(cmd)
    cmd ! match {
      case 0 => Some(Json.parse(Source.fromFile(out).mkString).as[Cluster])
      case _ => None
    }
  }

  def assign(tiles: String, clusters: String, id: String): Option[List[Tile]] = {
    val out = matchFile(id) 
    val cmd = Seq(binary, "--assign", "1.414", "1024", clusterFile(clusters), out, tileFile(tiles));
    println(cmd)
    cmd ! match {
      case 0 => Some(Json.parse(Source.fromFile(out).mkString).as[List[Tile]])
      case _ => None
    }
  }

  // def tiles(id: String) = {
  //   val cmd = Seq(binary, "--tiles", "1.414", "11", tileFile(id))
  //   println(cmd)
  //   cmd !
  // }

  def generate(tile: String, cluster: String, match_id: String, output: String): Option[String] = {
    val cmd = Seq(binary, "--generate", "1.414", "1024", tileFile(tile), clusterFile(cluster), matchFile(match_id), mosaicFile(output))
    println(cmd)
    cmd ! match {
      case 0 => Some(output)
      case _ => None
    }
  }

  def generateMosaic(mosaic: Mosaic, photos: List[String]): Option[Mosaic] = {
    val mosaic_id = mosaic._id.get.stringify

    for {
      sorted <- cluster(photos, mosaic_id)
      tiles <- assign(mosaic_id, mosaic_id, mosaic_id)
    } yield mosaic.copy(photos = sorted.gists, tiles = tiles)
  }

  def renderMosaic(mosaic: Mosaic): Option[String] = {
    val mosaic_id = mosaic._id.get.stringify
    generate(mosaic_id, mosaic_id, mosaic_id, mosaic_id + ".jpg")
  }
}
