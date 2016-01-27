package services

import javax.inject._
import play.api.libs.json._
import play.api.libs.Files.TemporaryFile
import play.api.Play
import scala.util.{Try, Success, Failure}
import scala.concurrent.{Future, Await}
import scala.concurrent.duration._
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import scala.sys.process._

import java.io._
import java.nio.file._
import org.apache.commons.io.FileUtils;
import org.apache.commons.codec.binary.Hex;
import java.security.MessageDigest
import collection.JavaConversions._

import models._
import bigpiq.shared._


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

  def getSizeOpt(size: String) = if (size == "full") ""
      else if (size.startsWith("pct:")) "-resize " + size.stripPrefix("pct:") + "%"
      else if (size.startsWith("!")) "-resize " + size.stripPrefix("!").split(",").mkString("x")
      else "-resize " + (size.split(",") match {
        case Array(w) => w
        case Array("",h) => "x" + h
        case Array(w,h) => w + "x" + h + "!"
      })

  def getRotationOpt(rotation: String) = {
    "-rotate " + rotation
  }

  def convert(hash: String, region: String, size: String, rotation: String, quality: String, format: String) = Future {
    val converted = new ByteArrayOutputStream()
    val opts = Array(
      getSizeOpt(size),
      getRotationOpt(rotation)
    ).mkString(" ")
    val cmd = s"convert - $opts -" #< new File(photoFile(hash)) #> converted
    cmd.!
    converted.toByteArray
  }

  def bytesToFile(bytes: Future[Array[Byte]]) : String = {
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
  
  
  def bytesFromTemp(uploaded: TemporaryFile) : Photo = {
    val data = FileUtils.readFileToByteArray(uploaded.file)
    val hash = hashFromContent(data)
    Photo(None, 0, hash, data)
  }


  def save(uploaded: TemporaryFile): Photo = {
    val data = FileUtils.readFileToByteArray(uploaded.file)
    val hash = hashFromContent(data)
    val newFile = new File(photoFile(hash))
    uploaded.moveTo(newFile)
    newFile.setReadable(true, false)
    newFile.setExecutable(true, false)
    Photo(None, 0, hash, data)
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
