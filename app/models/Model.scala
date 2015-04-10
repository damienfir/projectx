package models;

import play.api.libs.json._
import org.apache.commons.io.FileUtils;
import java.util.UUID;
import java.io._


abstract class FileModel {
  val baseDir: String
  def fullPath(name: String): String = s"$baseDir/$name"
  def getFile(name: String): File = new File(fullPath(name))
}

// abstract class JsonModel[T] extends FileModel {
//   type T;
//   def default: T;
//   implicit val jsonFormat: Format[T]

//   // def generateNew: String = (new Random).alphanumeric.take(8)
//   def generateNew: String = UUID.randomUUID().toString()

//   def get(implicit name: String): T = {
//     try {
//       val content = FileUtils.readFileToString(getFile(name))
//       Json.parse(content).as[T]
//     } catch {
//       case e: IOException => default
//     }
//   }

//   def write(item: T)(implicit name: String): Boolean = {
//     try {
//       FileUtils.writeStringToFile(getFile(name), Json.toJson(item).toString)
//       true
//     } catch {
//       case e: IOException => false
//     }
//   }
// }
