package bigpiq.server.services

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
import bigpiq.shared._


class MosaicService @Inject()() {

  val binary = Play.current.configuration.getString("px.binary").get

  def getMosaicFile(filename: String) = new File(mosaicFile(filename))

  def mosaicFile(id: String) = Play.current.configuration.getString("px.dir_generated").get + s"/$id"
  def photoFile(id: String) = Play.current.configuration.getString("px.dir_photos").get + s"/$id"

  def gistFile(id: String) = Play.current.configuration.getString("px.dir_gist").get + s"/$id"
  def clusterFile(id: String) = Play.current.configuration.getString("px.dir_clusters").get + s"/$id"
  def matchFile(id: String) = Play.current.configuration.getString("px.dir_match").get + s"/$id"
  def tileFile(id: String) = Play.current.configuration.getString("px.dir_tile").get + s"/$id"


  def tilesToDB(photos: List[Photo])(tile: MosaicModels.Tile2): Tile = {
    Tile(
      photo=photos.filter(_.hash == tile.imfile.split("/").last).head,
      rot=tile.rot,
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


  def tilesPython(photos: Seq[String], id: String) = Future {
    val out = matchFile(id)
    val cmd = binary +: "1.414" +: photos.map(photoFile) :+ out
    println(cmd)
    cmd ! match {
      case 0 => Json.parse(Source.fromFile(out).mkString).as[List[MosaicModels.Tile2]]
      case _ => throw new Exception
    }
  }

  def generateComposition(pageID: Long, photos: List[Photo]): Future[List[Tile]] =
    if (photos.isEmpty) Future(Nil)
    else tilesPython(photos.map(_.hash), pageID.toString)
      .map(_.map(tilesToDB(photos)))

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

  def blankSVG = """<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
    width="297mm"
    height="210mm"></svg>
    """

  def joinPDFs(fnames: List[String]) : String = {
    val out = UUID.randomUUID.toString + ".pdf"
    "pdfunite " + fnames.mkString(" ") + " " + mosaicFile(out) ! match {
      case 0 => {
        fnames.map(f => new File(f).delete)
        out
      }
      case _ => throw new Exception
    }
  }

  def makePDFs(svgs: List[String]) = (svgs.head :: (blankSVG :: svgs.tail)) map {
    svg => {
      val f = mosaicFile(UUID.randomUUID.toString)
      writeFile(f+".svg", svg)
      "inkscape -d 300 " + f+".svg -A " + f+".pdf" ! match {
        case 0 => {
          new File(f + ".svg").delete
          f + ".pdf"
        }
        case _ => throw new Exception
      }
    }
  }

  def makeAlbum(svgs: List[String]) = joinPDFs(makePDFs(svgs))

  def makeAlbumFile(svgs: List[String]) : File = new File(mosaicFile(makeAlbum(svgs)))

  def writeSVG(id: Long, content: String) = {
    val fname = id.toString + ".svg"
    writeFile(mosaicFile(fname), content)
    fname
  }
}
