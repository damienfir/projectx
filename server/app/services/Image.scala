package bigpiq.server.services

import javax.inject._

import play.api.libs.json._
import play.api.libs.Files.TemporaryFile
import play.api.Play

import scala.util.{Failure, Success, Try}
import scala.concurrent.{Await, Future}
import scala.concurrent.duration._
import play.api.libs.concurrent.Execution.Implicits.defaultContext

import scala.sys.process._
import java.io._
import java.nio.file._

import org.apache.commons.io.FileUtils
import org.apache.commons.codec.binary.Hex
import java.security.MessageDigest
import java.util.Date

import collection.JavaConversions._
import models._
import bigpiq.shared._
import com.drew.imaging.ImageMetadataReader
import com.drew.metadata.exif.{ExifDirectoryBase, ExifSubIFDDescriptor, ExifSubIFDDirectory}


class ImageService @Inject()() {
  def tmp(s: String) = s"/tmp/$s"

  def photoFile(id: String) = Play.current.configuration.getString("px.dir_photos").get + s"/$id"

  def thumbFile(id: String) = Play.current.configuration.getString("px.dir_thumbs").get + s"/$id"

  def hashFromContent(data: Array[Byte]): String = {
    var digest = MessageDigest.getInstance("SHA-1")
    digest.update(data)
    Hex.encodeHexString(digest.digest())
  }

  def resize(filename: String): String = {
    val cmd = Seq("convert", photoFile(filename), "-resize", "800x800", thumbFile(filename))
    cmd.! match {
      case 0 => filename
      case _ => throw new Exception()
    }
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
      println(cmd)
      cmd.!
      output.toByteArray
    }

  def getDate(imageData: Array[Byte]): Option[Date] = {
    val metadata = ImageMetadataReader.readMetadata(new ByteArrayInputStream(imageData))
    val exifDirectory = metadata.getFirstDirectoryOfType(classOf[ExifSubIFDDirectory])
    try {
      Some(exifDirectory.getDate(ExifDirectoryBase.TAG_DATETIME_ORIGINAL))
    } catch {
      case e => None
    }
  }

  def bytesToFile(bytes: Future[Array[Byte]]): String = {
    val content = Await.result(bytes, 5.seconds)
    val fname = tmp(hashFromContent(content))
    val f = Paths.get(fname)
    Files.write(f, content)
    fname
  }

  //   def save(data: Array[Byte]): String = {
  //     val filename = hashFromContent(data)
  //     val file = new File(photoFile(filename))

  //     FileUtils.writeByteArrayToFile(file, data)
  //     // resize(filename)
  //     // Success(filename)
  //     filename
  //   }


  //  def bytesFromTemp(uploaded: TemporaryFile) : Photo = {
  //    val data = FileUtils.readFileToByteArray(uploaded.file)
  //    val hash = hashFromContent(data)
  //    Photo(None, 0, hash, data)
  //  }


  def save(uploaded: TemporaryFile): (String, Array[Byte]) = {
    val data = FileUtils.readFileToByteArray(uploaded.file)
    val hash = hashFromContent(data)
    val newFile = new File(photoFile(hash))
    uploaded.moveTo(newFile)
    newFile.setReadable(true, false)
    newFile.setExecutable(true, false)
    (hash, data)
    // val thumbFilename = resize(filename)
    // val thumb = new File(thumbFile(thumbFilename))
    // thumb.setReadable(true, false)
    // thumb.setExecutable(true, false)
    // thumbFilename
  }

  // def saveImages(newImages: Seq[TemporaryFile]): Future[Seq[String]] = Future {
  //   newImages.filter(_.file.length > 4).map(save)
  // }
}
