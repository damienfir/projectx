package bigpiq.services

import java.io.{ByteArrayOutputStream, File, PrintWriter}
import java.nio.file.{Files, Paths}
import java.util.UUID
import javax.inject.Inject
import play.api.libs.concurrent.Execution.Implicits.defaultContext

import bigpiq.db
import bigpiq.shared.{BookModel, Photo, Tile}
import play.api.Play
import play.api.libs.json.Json

import scala.concurrent.Future
import scala.sys.process._


object MosaicModels {

  case class Cluster(
                      gists: List[String],
                      sorted: List[Int]
                    )

  case class Tile(
                   tileindex: Int,
                   imgindex: Int,
                   cx1: Float,
                   cx2: Float,
                   cy1: Float,
                   cy2: Float,
                   tx1: Float,
                   tx2: Float,
                   ty1: Float,
                   ty2: Float
                 )

  case class Tile2(
                    imfile: String,
                    rot: Int,
                    cx1: Float,
                    cx2: Float,
                    cy1: Float,
                    cy2: Float,
                    tx1: Float,
                    tx2: Float,
                    ty1: Float,
                    ty2: Float
                  )

  implicit val tile2format = Json.format[Tile2]
  implicit val tileformat = Json.format[Tile]
  implicit val clusterformat = Json.format[Cluster]
}

class MosaicService @Inject()(imageService: ImageService) {

  val binary = Play.current.configuration.getString("px.binary").get

  def tmpFolder = Play.current.configuration.getString("px.dir_generated").get

  def tmpFile(name: String) = tmpFolder + s"/$name"

  def tilesToDB(photos: List[Photo])(tile: MosaicModels.Tile2): Option[Tile] =
    photos.find(_.hash == tile.imfile.split("/").last) map { p =>
      Tile(
        photo = p,
        rot = tile.rot,
        cx1 = tile.cx1,
        cx2 = tile.cx2,
        cy1 = tile.cy1,
        cy2 = tile.cy2,
        tx1 = tile.tx1,
        tx2 = tile.tx2,
        ty1 = tile.ty1,
        ty2 = tile.ty2
      )
    }

  def tilesPython(photos: List[File], ratio: Double) = Future {
    val json = new ByteArrayOutputStream()
    val filenames = photos.map(_.getAbsolutePath)
    val cmd = (binary +: ratio.toString +: filenames :+ "-") #> json
    cmd ! match {
      case 0 => Json.parse(json.toString).as[List[MosaicModels.Tile2]]
      case _ => throw new Exception
    }
  }

  def generateComposition(photos: List[(db.Photo, db.PhotoData)], ratio: Double): Future[List[Tile]] =
    if (photos.isEmpty) Future(Nil)
    else tilesPython(photos.map{ case (p,d) => imageService.bytesToFile(d.data, tmpFolder) }, ratio) map { tiles =>
      tiles.map(tilesToDB(photos.map(_._1.export)))
        .flatten
    }

  def writeFile(filename: String, content: String): String = {
    val file = new File(filename)
    val writer = new PrintWriter(file);
    writer.write(content)
    writer.close()
    filename
  }


  def joinPDFs(fnames: List[String]): String = {
    val out = UUID.randomUUID.toString + ".pdf"
    "pdfunite " + fnames.mkString(" ") + " " + tmpFile(out) ! match {
      case 0 => {
        fnames.map(f => new File(f).delete)
        out
      }
      case _ => throw new Exception
    }
  }

  def makePDFs(svgs: List[String], pdfVersion: String, dpi: Int): Future[List[String]] =
    Future {
      svgs.map { svg => {
        val f = tmpFile(UUID.randomUUID.toString)
        writeFile(f + ".svg", svg)
        s"inkscape -d $dpi --export-text-to-path $f.svg -A $f.pdf" ! match {
          case 0 => {
            new File(f + ".svg").delete
            f + ".pdf"
          }
          case _ => throw new Exception
        }
      }
      }
    }

  def zip(files: List[File]): Future[File] = {
    val o = files.head + ".zip"
    Future("zip" +: "-j" +: o +: files.map(_.getAbsolutePath) !) map {
      case 0 =>
        files.map(_.delete())
        new File(o)
      case _ => throw new Exception
    }
  }

  def makeAlbumFile(svgs: List[String], bookModel: BookModel): Future[File] =
    makePDFs(svgs, bookModel.pdfVersion, 300).map { files =>
      new File(tmpFile(joinPDFs(files)))
    }


  def writeSVG(id: Long, content: String) = {
    val fname = id.toString + ".svg"
    writeFile(tmpFile(fname), content)
    fname
  }

}
