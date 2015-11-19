package services

import javax.inject.Inject
import scala.concurrent.Future
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import play.api.Play
import play.api.libs.ws._

import models._


class Email @Inject()(ws: WSClient) {
  val host = Play.current.configuration.getString("px.host").get
  val apiBase = Play.current.configuration.getString("px.mailgun-base").get
  val apiKey = Play.current.configuration.getString("px.mailgun-key").get
  val fromEmail = Play.current.configuration.getString("px.from-email").get

  def message = ws.url(s"$apiBase/messages")

  def sendLink(email: String, id: Long) = {
    val res = message.post(Map(
      "from" -> Seq(fromEmail),
      "to" -> Seq(email),
      "subject" -> Seq("Link to your saved album"),
      "text" -> Seq(s"""Thank you for saving your album on bigpiq.

To get back to your album, please click on this link:
http://${host}/ui/${id.toString}

Faithfully yours,
Damien & RK""")))

    res.map(_.json)
  }

  def confirmOrder(order: APIModels.Order, info: APIModels.Info) = {
    val res = message.withAuth("api", apiKey, WSAuthScheme.BASIC)
      .post(Map(
        "from" -> Seq(fromEmail),
        "to" -> Seq(info.email),
        "subject" -> Seq("Thank you. Your order is processing"),
        "text" -> Seq(s"""Dear ${info.firstName},

Thank you for ordering your album with us, we are processing your order and will let you know when it's ready.

You can view your album and modify it until the order is processed. Please click on the following url:
http://${host}/ui/${order.collectionID}

Faithfully yours,
Damien & RK""")))

    res.map(_.json)
  }
}
