package services

import javax.inject._
import play.api.libs.json._
import play.api.libs.Files.TemporaryFile
import play.api.Play
import scala.util.{Try, Success, Failure}
import scala.concurrent.Future
import play.api.libs.concurrent.Execution.Implicits.defaultContext
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


class ImageService @Inject()() extends FileService {
  val baseDir = Play.current.configuration.getString("px.dir_photos").get
  // val thumbDir = Play.current.configuration.getString("px.dir_thumb").get
  val stockDir = Play.current.configuration.getString("px.dir_stock").get
  
  def hashFromContent(data: Array[Byte]): String = {
    var digest = MessageDigest.getInstance("SHA-1")
    digest.update(data)
    Hex.encodeHexString(digest.digest())
  }

  // def resize(filename: String): Try[String] = {
  //   val output = s"$thumbDir/$filename"
  //   val cmd = Seq("convert", fullPath(filename), "-resize", "150x150", output)
  //   cmd.! match {
  //     case 0 => Success(output)
  //     case _ => Failure(new Exception())
  //   }
  // }

  def save(data: Array[Byte]): String = {
    val filename = hashFromContent(data)
    val file = getFile(filename)

    FileUtils.writeByteArrayToFile(file, data)
    // resize(filename)
    // Success(filename)
    filename
  }

  def save(uploaded: TemporaryFile): String = {
    val filename = hashFromContent(FileUtils.readFileToByteArray(uploaded.file))
    val newFile = getFile(filename)
    newFile.setReadable(true, false)
    newFile.setExecutable(true, false)

    uploaded.moveTo(newFile)
    // resize(filename)
    // Success(filename)
    filename
  }

  def saveImages(newImages: Seq[TemporaryFile]): Future[Seq[String]] = Future {
    newImages
      .filter(_.file.length > 4)
      .map(save)
      // .filter(_.isSuccess)
      // .map(_.get)
  }

  def listStock = {
    val stockFileDir = new File(stockDir)
    FileUtils.listFiles(stockFileDir, Array("jpeg"), false).map(_.getName())
  }
}
