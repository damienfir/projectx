package bigpiq.server.services

import java.io._
import java.nio.file._
import java.security.MessageDigest
import java.util.{Date, UUID}
import javax.inject._

import bigpiq.server.db
import bigpiq.shared._
import com.drew.imaging.ImageMetadataReader
import com.drew.metadata.exif.{ExifDirectoryBase, ExifSubIFDDirectory}
import models._
import org.apache.commons.codec.binary.Hex
import org.apache.commons.io.FileUtils
import play.api.Play
import play.api.libs.Files.TemporaryFile
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import play.api.libs.json._

import scala.concurrent.Future
import scala.sys.process._


class ImageService @Inject()() {
  def tmp(s: String) = s"/tmp/$s"

  val binary = Play.current.configuration.getString("px.binary").get

  def tmpFile(name: String) = Play.current.configuration.getString("px.dir_photos").get + s"/$name"

  def hashFromContent(data: Array[Byte]): String = {
    var digest = MessageDigest.getInstance("SHA-1")
    digest.update(data)
    Hex.encodeHexString(digest.digest())
  }

  def getSizeOpt(size: String): String = if (size == "full") ""
  else if (size.startsWith("pct:")) "-resize " + size.stripPrefix("pct:") + "%"
  else if (size.startsWith("!")) "-resize " + size.stripPrefix("!").split(",").mkString("x")
  else "-resize " + (size.split(",") match {
    case Array(w) => w
    case Array("", h) => "x" + h
    case Array(w, h) => w + "x" + h + "!"
  })

  def getRotationOpt(rotation: String): String = {
    "-rotate " + rotation
  }

  def getQuality(quality: String): String = "-quality 80"

  def convert(data: Array[Byte], region: String, size: String, rotation: String, quality: String, format: String): Future[Array[Byte]] =
    Future {
      val output = new ByteArrayOutputStream()
      val input = new ByteArrayInputStream(data)
      val opts = Array(
        getSizeOpt(size),
        getRotationOpt(rotation),
        getQuality(quality)
      ).mkString(" ")
      val cmd = s"convert - $opts jpg:-" #< input #> output
      cmd.!
      output.toByteArray
    }

  def getDate(imageData: Array[Byte]): Option[Date] = {
    val metadata = ImageMetadataReader.readMetadata(new ByteArrayInputStream(imageData))
    val exifDirectory = metadata.getFirstDirectoryOfType(classOf[ExifSubIFDDirectory])
    try {
      Some(exifDirectory.getDate(ExifDirectoryBase.TAG_DATETIME_ORIGINAL))
    } catch {
      case e: Throwable => None
    }
  }

  def bytesToFile(bytes: Array[Byte]): File = {
    val fname = tmp(hashFromContent(bytes))
    val f = Paths.get(fname)
    Files.write(f, bytes)
    new File(fname)
  }

  def save(uploaded: TemporaryFile): (String, Array[Byte]) = {
    val data = FileUtils.readFileToByteArray(uploaded.file)
    val hash = hashFromContent(data)
    (hash, data)
  }

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

  def tilesPython(photos: List[File]) = Future {
    val json = new ByteArrayOutputStream()
    val filenames = photos.map(f => tmpFile(f.getName))
    val cmd = (binary +: "1.414" +: filenames :+ "-") #> json
    cmd ! match {
      case 0 => Json.parse(json.toString).as[List[MosaicModels.Tile2]]
      case _ => throw new Exception
    }
  }

  def generateComposition(photos: List[db.Photo]): Future[List[Tile]] =
    if (photos.isEmpty) Future(Nil)
    else tilesPython(photos.map(p => bytesToFile(p.data))) map { tiles =>
      tiles.map(tilesToDB(photos.map(_.export)))
        .flatten
    }

  def writeFile(filename: String, content: String) = {
    val file = new File(filename)
    val writer = new PrintWriter(file);
    writer.write(content)
    writer.close()
    filename
  }

  def blankSVG =
    """<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
    width="297mm"
    height="210mm"></svg>
    """

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

  def makePDFs(svgs: List[String]) = (svgs.head :: (blankSVG :: svgs.tail)) map {
    svg => {
      val f = tmpFile(UUID.randomUUID.toString)
      writeFile(f + ".svg", svg)
      "inkscape -d 300 " + f + ".svg -A " + f + ".pdf" ! match {
        case 0 => {
          new File(f + ".svg").delete
          f + ".pdf"
        }
        case _ => throw new Exception
      }
    }
  }

  def makeAlbum(svgs: List[String]) = joinPDFs(makePDFs(svgs))

  def makeAlbumFile(svgs: List[String]): File = new File(tmpFile(makeAlbum(svgs)))

  def writeSVG(id: Long, content: String) = {
    val fname = id.toString + ".svg"
    writeFile(tmpFile(fname), content)
    fname
  }
}
