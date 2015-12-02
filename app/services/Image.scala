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


class ImageService @Inject()() {
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

//   def save(data: Array[Byte]): String = {
//     val filename = hashFromContent(data)
//     val file = new File(photoFile(filename))

//     FileUtils.writeByteArrayToFile(file, data)
//     // resize(filename)
//     // Success(filename)
//     filename
//   }

  def save(uploaded: TemporaryFile): String = {
    val filename = hashFromContent(FileUtils.readFileToByteArray(uploaded.file))
    val newFile = new File(photoFile(filename))
    uploaded.moveTo(newFile)
    newFile.setReadable(true, false)
    newFile.setExecutable(true, false)
    val thumbFilename = resize(filename)
    val thumb = new File(thumbFile(thumbFilename))
    thumb.setReadable(true, false)
    thumb.setExecutable(true, false)
    thumbFilename
  }

  def saveImages(newImages: Seq[TemporaryFile]): Future[Seq[String]] = Future {
    newImages.filter(_.file.length > 4).map(save)
  }
}
