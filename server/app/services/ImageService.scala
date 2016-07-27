package bigpiq.services

import java.io._
import java.nio.file._
import java.security.MessageDigest
import java.util.{Date, UUID}
import javax.inject._

import bigpiq.db
import bigpiq.shared._
import com.drew.imaging.ImageMetadataReader
import com.drew.metadata.exif.{ExifDirectoryBase, ExifSubIFDDirectory}
import org.apache.commons.codec.binary.Hex
import org.apache.commons.io.FileUtils
import play.api.Play
import play.api.libs.Files.TemporaryFile
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import play.api.libs.json._

import scala.concurrent.Future
import scala.sys.process._


class ImageService @Inject()() {

  def tmpFolder = Play.current.configuration.getString("px.dir_generated").get

  def tmpFile(name: String) = tmpFolder + s"/$name"

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

  def hashFromContent(data: Array[Byte]): String = {
    var digest = MessageDigest.getInstance("SHA-1")
    digest.update(data)
    Hex.encodeHexString(digest.digest())
  }

  def validateImageFile(bytes: Array[Byte]): Future[Boolean] =
    Future("identify -" #< new ByteArrayInputStream(bytes) #> new ByteArrayOutputStream() !) map {
      case 0 => true
      case _ => false
    }

  def save(uploaded: TemporaryFile): Future[Option[(String, Array[Byte])]] = {
    val data = FileUtils.readFileToByteArray(uploaded.file)
    validateImageFile(data) map (valid => if (valid) Some((hashFromContent(data), data)) else None)
  }

  def bytesToFile(bytes: Array[Byte], folder: String): File = {
    val fname = s"$folder/${hashFromContent(bytes)}"
    val f = Paths.get(fname)
    Files.write(f, bytes)
    new File(fname)
  }

  def bytesToFile(bytes: Array[Byte]): File = bytesToFile(bytes, tmpFolder)


}
