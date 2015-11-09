package services

import javax.inject._
import java.util.UUID
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


class MosaicService @Inject()() {

  val binary = Play.current.configuration.getString("px.binary").get

  // def genericFile(path: String) = id => s"$path/$id"
  
  def getMosaicFile(filename: String) = new File(mosaicFile(filename))

  def mosaicFile(id: String) = Play.current.configuration.getString("px.dir_generated").get + s"/$id"
  def photoFile(id: String) = Play.current.configuration.getString("px.dir_photos").get + s"/$id"

  def gistFile(id: String) = Play.current.configuration.getString("px.dir_gist").get + s"/$id"
  def clusterFile(id: String) = Play.current.configuration.getString("px.dir_clusters").get + s"/$id"
  def matchFile(id: String) = Play.current.configuration.getString("px.dir_match").get + s"/$id"
  def tileFile(id: String) = Play.current.configuration.getString("px.dir_tile").get + s"/$id"


  def tilesToDB(cluster: MosaicModels.Cluster, photos: Seq[DBModels.Photo])(tile: MosaicModels.Tile): DBModels.Tile = {
    DBModels.Tile(
      photoID=photos.filter(_.hash.equals(cluster.gists(cluster.sorted(tile.imgindex)).split("/").last)).head.id.get,
      cx1=tile.cx1,
      cx2=tile.cx2,
      cy1=tile.cy1,
      cy2=tile.cy2,
      tx1=tile.tx1,
      tx2=tile.tx2,
      ty1=tile.ty1,
      ty2=tile.ty2
    )
  }


  def tilesToMosaic(tiles: List[DBModels.Tile], photos: Seq[DBModels.Photo]): (MosaicModels.Cluster, List[MosaicModels.Tile]) = {
    val gists = tiles.map(t => photos.find(_.id == Some(t.photoID)).get.hash).map(gistFile)
    val newTiles = tiles.zipWithIndex.map({ case (tile,i) => MosaicModels.Tile(
      tileindex = i,
      imgindex = i,
      cx1=tile.cx1,
      cx2=tile.cx2,
      cy1=tile.cy1,
      cy2=tile.cy2,
      tx1=tile.tx1,
      tx2=tile.tx2,
      ty1=tile.ty1,
      ty2=tile.ty2
      )})
    val cluster = MosaicModels.Cluster(
      gists = gists,
      sorted = gists.zipWithIndex.map(_._2)
    )
    (cluster, newTiles)
  }


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

  def cluster(gists: Seq[String], id: String): Future[MosaicModels.Cluster] = Future {
    val out = clusterFile(id)
    println(gists.length)
    val cmd = binary +: "--cluster" +: gists.length.toString +: gists.map(gistFile) :+ out
    println(cmd)
    cmd ! match {
      case 0 => Json.parse(Source.fromFile(out).mkString).as[MosaicModels.Cluster]
      case _ => throw new Exception
    }
  }

  def assign(tiles: String, clusters: String, id: String): Future[List[MosaicModels.Tile]] = Future {
    val out = matchFile(id) 
    val cmd = Seq(binary, "--assign", "1.414", "3508", clusterFile(clusters), out, tileFile(tiles));
    println(cmd)
    cmd ! match {
      case 0 => Json.parse(Source.fromFile(out).mkString).as[List[MosaicModels.Tile]]
      case _ => throw new Exception
    }
  }

  // def tiles(id: String) = {
  //   val cmd = Seq(binary, "--tiles", "1.414", "11", tileFile(id))
  //   println(cmd)
  //   cmd !
  // }
  

  def generateComposition(compositionID: Long, photos: Seq[DBModels.Photo]): Future[List[DBModels.Tile]] = {
    val id = compositionID.toString
    for {
      clu <- cluster(photos.map(_.hash), id)
      tiles <- assign(id, id, id)
    } yield tiles.map(tilesToDB(clu, photos))
  }


  def render(tile: String, cluster: String, match_id: String, output: String): Future[String] = Future {
    val cmd = Seq(binary, "--generate", "1.414", "3508", tileFile(tile), clusterFile(cluster), matchFile(match_id), mosaicFile(output))
    println(cmd)
    cmd ! match {
      case 0 => output
      case _ => throw new Exception
    }
  }

  def readFile(filename: String) = Source.fromFile(filename).mkString
  def readJson(filename: String) = Json.parse(readFile(filename))

  def readGist(hash: String) = readJson(gistFile(hash))

  def writeFile(filename: String, content: String) = {
    val file = new File(filename)
    val writer = new PrintWriter(file);
    writer.write(content)
    writer.close()
    filename
  }

  def writeJson(filename: String, content: JsValue) = {
    writeFile(filename, content.toString)
  }

  def renderComposition(composition: DBModels.Composition, photos: Seq[DBModels.Photo]): Future[String] = {
    val id = composition.id.get.toString
    val (cluster,mosaictiles) = tilesToMosaic(composition.tiles, photos)
    writeJson(clusterFile(id), Json.toJson(cluster))
    writeJson(matchFile(id), Json.toJson(mosaictiles))
    render(id, id, id, id + ".jpg")
  }


  def joinPDFs(fnames: List[String]) = {
    val out = UUID.randomUUID.toString + ".pdf"
    "pdfjoin " + fnames.mkString(" ") + " --rotateoversize false -q --paper a4paper -o " + mosaicFile(out) ! match {
      case 0 => {
        fnames.map(f => (new File(f)).delete)
        out
      }
      case _ => throw new Exception
    }
  }

  def makePDFs(svgs: List[String]) = svgs.map {
    svg => {
      val f = mosaicFile(UUID.randomUUID.toString)
      writeFile(f+".svg", svg)
      "inkscape -d 300 " + f+".svg -A " + f+".pdf" ! match {
        case 0 => {
          (new File(f+".svg")).delete
          f + ".pdf"
        }
        case _ => throw new Exception
      }
    }
  }

  def makeAlbum(svgs: List[String]) = joinPDFs(makePDFs(svgs))

  def writeSVG(id: Long, content: String) = {
    val fname = id.toString + ".svg"
    writeFile(mosaicFile(fname), content)
    fname
  }
}
