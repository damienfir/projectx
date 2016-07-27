package bigpiq.client

import diode.data.{Empty, Pot, Ready}
import org.scalajs.dom
import org.scalajs.dom.File
import org.scalajs.dom.ext.Ajax
import org.scalajs.dom.raw.FormData
import org.scalajs.jquery.{JQueryAjaxSettings, _}

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.{Future, Promise}
import scala.scalajs.js
import scala.scalajs.js.Dynamic.{global => g}
import bigpiq.shared._

import upickle.default._
import upickle.Js


object AjaxClient extends autowire.Client[Js.Value, Reader, Writer] {
  override def doCall(req: Request) = Ajax.post(
    url = s"/api/"+req.path.mkString("/"),
    data = upickle.json.write(Js.Obj(req.args.toSeq:_*))
  ).map(_.responseText)
    .map(upickle.json.read)

  def read[Result: Reader](p: Js.Value) = readJs[Result](p)
  def write[Result: Writer](r: Result) = writeJs(r)
}


object Helper {
  def getUserIDFromCookie: Option[Long] = {
    dom.document.cookie.split(";")
      .map(_.trim).map(_.split("="))
      .map(l => (l.head, l.tail.headOption.getOrElse("")))
      .toMap.get("bigpiquser")
      .map(_.toLong)
  }

  def getAlbumHash(): Option[String] =
    Some(dom.window.location.pathname.split("/")).filter(_.length > 2).map(_.last)

  def uploadFile(file: File, id: Long): Future[Photo] = {
    var fd = new FormData()
    fd.append("image", file)
    val p = Promise[Photo]()
    jQuery.ajax(js.Dynamic.literal(
      url = s"/collections/$id/photos",
      method = "POST",
      data = fd,
      processData = false,
      contentType = false,
      dataType = "text",
      success = (data: String, textStatus: String, jqXHR: JQueryXHR) => p.success(read[Photo](data)),
      error = (jqXHR: JQueryXHR, textStatus: String, errorThrow: String) => p.failure(new Exception(errorThrow))
    ).asInstanceOf[JQueryAjaxSettings])
    p.future
  }

  def updateUrl(hash: String) = dom.history.pushState("", "", s"/ui/${hash}")
}