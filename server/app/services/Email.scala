package bigpiq.server.services

import javax.inject.Inject
import scala.concurrent.Future
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import play.api.Play
import play.api.libs.ws._

import models._
import bigpiq.shared._


class Email @Inject()(ws: WSClient) {
  val host = Play.current.configuration.getString("px.host").get
  val apiBase = Play.current.configuration.getString("px.mailgun-base").get
  val apiKey = Play.current.configuration.getString("px.mailgun-key").get
  val fromEmail = Play.current.configuration.getString("px.from-email").get

  def message = ws.url(s"$apiBase/messages").withAuth("api", apiKey, WSAuthScheme.BASIC)

  def sendLink(email: String, hash: String) = {
    message
      .post(Map(
        "from" -> Seq(fromEmail),
        "to" -> Seq(email),
        "subject" -> Seq("Link to your saved album"),
        "text" -> Seq(s"""Thank you for saving your album on bigpiq.

To get back to your album, please click on this link:
http://$host/ui/$hash

Faithfully yours,
Damien & RK""")))
    .map(x => {
        println(x)
        x.body
    })
  }

  def confirmOrder(collectionID: Long, email: String, firstName: String) = {
    val res = message
      .post(Map(
        "from" -> Seq(fromEmail),
        "to" -> Seq(email),
        "subject" -> Seq("Thank you. Your order is processing"),
        "text" -> Seq(s"""Dear $firstName,

Thank you for ordering your album with us, we are processing your order and will let you know when it's ready.

You can view your album and modify it until the order is processed. Please click on the following url:
http://$host/ui/$collectionID

Faithfully yours,
Damien & RK""")))

    res.map(_.json)
  }
}
