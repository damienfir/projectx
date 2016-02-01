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
    dom.document.cookie.split(";").map(_.trim).map(_.split("=")).map(l => (l.head, l.tail.head)).toMap.get("bigpiquser").map(_.toInt)
  }

  def getAlbumHash(): Option[String] =
    Some(dom.window.location.pathname.split("/")).filter(_.length > 2).map(_.last)

  def uploadFile(file: File, id: Long) = {
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
      success = (data: String) => p.success(read[Photo](data))
    ).asInstanceOf[JQueryAjaxSettings])
    p.future
  }
}
//object Api {
//  def postJSON(url: String, data: String) = Ajax.post(
//    url=url,
//    data=data,
//    responseType="text", // uPickle can't parse js.Object
//    headers = Map("Content-Type" -> "application/json")
//  ).map(r => r.responseText)
//
//
//  def getUser(id: Long): Future[Pot[User]] = Ajax.get(s"/users/$id")
//    .map(r => Ready(read[User](r.responseText)))
//
//  def createUser(): Future[Pot[User]] = postJSON(s"/users", write(User()))
//    .map(v => Ready(read[User](v)))
//
//
//  def getAlbumFromHash(userID: Long, hash: String): Future[Stored] = Ajax.get(s"/users/$userID/albums/$hash")
//    .map(r => read[Stored](r.responseText))
//
//
//  def createCollection(userID: Long) : Future[Pot[Collection]] = postJSON(s"/users/$userID/collections", "{}")
//    .map(r => Ready(read[Collection](r)))
//
//  def makePages(photos: List[Photo], collectionID: Long, index: Int) : Future[Pot[List[Composition]]] =
//    postJSON(s"/collections/$collectionID/pages?index=$index", write(photos))
//      .map(v => Ready(List(read[Composition](v))))
//
//  def shufflePage(photos: List[Photo], collectionID: Long, pageID: Long): Future[Pot[List[Composition]]] = photos match {
//    case Nil => Future(Empty)
//    case _ => postJSON(s"/collections/$collectionID/page/$pageID", write(photos))
//      .map(v => Ready(List(read[Composition](v))))
//  }
//
//  def save(toSave: Save) = {
//    postJSON(s"/save", write(toSave))
//  }
//
//  def emailLink(userID: Long, email: String, hash: String): Future[String] = {
//    postJSON(s"/users/$userID/link/$hash", write(Map("email" -> email)))
//  }
//}
