package services

import javax.inject._
import scala.util.{Try, Success, Failure}
import scala.util.control.Exception
import scala.concurrent.Future
import scala.io.Source
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import scala.sys.process._
import play.api.libs.json._
import play.api.Play
import play.api.libs.Files.TemporaryFile
import java.io._

import models._
import Backend._


@Singleton
class MosaicService @Inject()() {
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


  def preprocess(filename: String): String =  {
      val out = gistFile(filename)
      val cmd = Seq(binary, "--preprocess", photoFile(filename), out)
      println(cmd)
      cmd.! match {
        case 0 => out
        case _ => throw new Exception
      }
  }

  def preprocessAll(filenames: Seq[String]): Future[Seq[String]] = Future {
    filenames.map(preprocess)
  }

  def cluster(gists: Seq[String], id: String): Future[Cluster] = Future {
    val out = clusterFile(id)
    val cmd = binary +: "--cluster" +: gists.length.toString +: gists.map(gistFile) :+ out
    println(cmd)
    cmd ! match {
      case 0 => Json.parse(Source.fromFile(out).mkString).as[Cluster]
      case _ => throw new Exception
    }
  }

  def assign(tiles: String, clusters: String, id: String): Future[List[Tile]] = Future {
    val out = matchFile(id) 
    val cmd = Seq(binary, "--assign", "1.414", "1024", clusterFile(clusters), out, tileFile(tiles));
    println(cmd)
    cmd ! match {
      case 0 => Json.parse(Source.fromFile(out).mkString).as[List[Tile]]
      case _ => throw new Exception
    }
  }

  // def tiles(id: String) = {
  //   val cmd = Seq(binary, "--tiles", "1.414", "11", tileFile(id))
  //   println(cmd)
  //   cmd !
  // }

  def generateComposition(composition_id: Long, photos: Seq[String]): Future[(List[String], List[Tile])] = {
    val id = composition_id.toString
    for {
      clu <- cluster(photos, id)
      tiles <- assign(id, id, id)
    } yield (clu.gists, tiles)
  }

  def render(tile: String, cluster: String, match_id: String, output: String): Future[String] = Future {
    val cmd = Seq(binary, "--generate", "1.414", "1024", tileFile(tile), clusterFile(cluster), matchFile(match_id), mosaicFile(output))
    println(cmd)
    cmd ! match {
      case 0 => output
      case _ => throw new Exception
    }
  }

  def renderComposition(id: String): Future[String] = {
    render(id, id, id, id + ".jpg")
  }

  def renderOtherComposition(id: String, tiles: Seq[Tile]): Future[String] = {
    val file = new File(matchFile(id))
    val writer = new PrintWriter(file);
    writer.write(Json.toJson(tiles).toString)
    writer.close()
    renderComposition(id)
  }
}
