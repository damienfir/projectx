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
    val cmd = binary +: "--cluster" +: "6" +: gists.map(gistFile) :+ out
    println(cmd)
    cmd ! match {
      case 0 => Some(Json.parse(Source.fromFile(out).mkString).as[Cluster])
      case _ => None
    }
  }

  def assign(tiles: String, clusters: String, id: String) = {
    val cmd = Seq(binary, "--assign", "6", tileFile(tiles), clusterFile(clusters), matchFile(id));
    println(cmd)
    cmd !
  }

  def tiles(id: String) = {
    val cmd = Seq(binary, "--tiles", "1.414", "6", tileFile(id))
    println(cmd)
    cmd !
  }

  def generate(tile: String, cluster: String, match_id: String, output: String) = {
    val cmd = Seq(binary, "--generate", "1.414", tileFile(tile), clusterFile(cluster), matchFile(match_id), mosaicFile(output))
    println(cmd)
    cmd !
  }

  def generateMosaic(mosaic: Mosaic, subset: Subset): Future[Option[Mosaic]] = Future {
    val mosaic_id = mosaic._id.get.stringify
    val subset_id = subset._id.get.stringify
    val image = mosaic_id + ".jpg"
    val image_display = mosaic_id + "_display.jpg"

    tiles(mosaic_id)
    assign(mosaic_id, subset_id, mosaic_id)
    generate(mosaic_id, subset_id, mosaic_id, image)

    Some(mosaic.copy(filename=Some(image), thumbnail=Some(image_display)))
  }
}
