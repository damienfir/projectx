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

  def writeFile(filename: String, content: String) = {
    val file = new File(filename)
    val writer = new PrintWriter(file);
    writer.write(content)
    writer.close()
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

  def makeTitlePage(title: Option[String]) : String = {
    val svg = Source.fromFile(mosaicFile("../title.svg")).mkString
    val svgmod = svg.replaceAll("\\{\\{title\\}\\}", title.get)
    val svgfile = mosaicFile(UUID.randomUUID().toString + ".svg")
    val pdffile = mosaicFile(UUID.randomUUID().toString + ".pdf")
    writeFile(svgfile, svgmod)
    val cmd = "inkscape " + svgfile + " -A " + pdffile
    println(cmd)
    cmd ! match {
      case 0 => pdffile
      case _ => throw new Exception
    }
  }

  def makePDFFromPages(pagesFilename: List[String]) : String = {
    val fname = UUID.randomUUID().toString + ".pdf"
    val out = mosaicFile(fname)
    val cmd = "convert -density 300x300 " + pagesFilename.map(mosaicFile).mkString(" ") + " " + out
    println(cmd)
    cmd ! match {
      case 0 => fname
      case _ => throw new Exception
    }
  }

  def makeAlbumPDF(title: Option[String], pages: String) : String = {
    val titlepage = makeTitlePage(title)
    val blank = mosaicFile("../blank.pdf")
    val albumname = UUID.randomUUID().toString + ".pdf"
    val out = mosaicFile(albumname)
    val cmd = "pdfjoin " + Seq(titlepage, blank, mosaicFile(pages), blank, blank).mkString(" ") + " --rotateoversize false --paper a4paper -o " + out
    println(cmd)
    cmd ! match {
      case 0 => albumname
      case _ => throw new Exception
    }
  }
  
  def makeAlbum(pagesFilename: List[String]) : String = {
    val fname = UUID.randomUUID().toString + ".jpg"
    val out = mosaicFile(fname)
    val cmd = "montage -geometry 100% -tile 2x " + pagesFilename.map(mosaicFile).mkString(" ") + " " + out
    println(cmd)
    cmd ! match {
      case 0 => fname
      case _ => throw new Exception
    }
  }
}
