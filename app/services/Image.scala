package services

import play.api.libs.json._
import play.api.libs.Files.TemporaryFile
import play.api.Play
import scala.util.{Try, Success, Failure}
import scala.sys.process._

import java.io._
import org.apache.commons.io.FileUtils;
import org.apache.commons.codec.binary.Hex;
import java.security.MessageDigest
import collection.JavaConversions._


trait FileService {
  val baseDir: String
  def fullPath(filename: String) = s"$baseDir/$filename"
  def getFile(filename: String) = new File(fullPath(filename))
}


object ImageService extends FileService {
  val baseDir = Play.current.configuration.getString("px.dir_photos").get
  val thumbDir = Play.current.configuration.getString("px.dir_thumb").get
  val stockDir = Play.current.configuration.getString("px.dir_stock").get
  
  def hashFromContent(data: Array[Byte]): String = {
    var digest = MessageDigest.getInstance("SHA-1")
    digest.update(data)
    Hex.encodeHexString(digest.digest())
  }

  def resize(filename: String): Try[String] = {
    val output = s"$thumbDir/$filename"
    val cmd = Seq("convert", fullPath(filename), "-resize", "150x150", output)
    cmd.! match {
      case 0 => Success(output)
      case _ => Failure(new Exception())
    }
  }

  def save(data: Array[Byte]): Try[String] = {
    val filename = hashFromContent(data)
    val file = getFile(filename)

    try {
      FileUtils.writeByteArrayToFile(file, data)
      resize(filename)
      Success(filename)
    } catch {
      case e: IOException => Failure(e)
    }
  }

  def save(uploaded: TemporaryFile): Try[String] = {
    val filename = hashFromContent(FileUtils.readFileToByteArray(uploaded.file))
    val newFile = getFile(filename)

    try {
      uploaded.moveTo(newFile)
      resize(filename)
      Success(filename)
    } catch {
      case e: IOException => Failure(e)
    }
  }

  def listStock = {
    val stockFileDir = new File(stockDir)
    FileUtils.listFiles(stockFileDir, Array("jpeg"), false).map(_.getName())
  }
}
