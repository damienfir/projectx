package services

import javax.inject.Inject
import scala.concurrent.Future
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import play.api.Play
import play.api.libs.ws._

import models._


class Email @Inject()(ws: WSClient) {
  val host = Play.current.configuration.getString("px.host").get
  val apiKey = Play.current.configuration.getString("px.mailgun-key").get
  val fromEmail = Play.current.configuration.getString("px.from-email").get

  def confirmOrder(order: APIModels.Order, info: APIModels.Info) = {
    val res = ws.url("https://api.mailgun.net/v3/bigpiq.com/messages")
      .withAuth("api", apiKey, WSAuthScheme.BASIC)
      .post(Map(
        "from" -> Seq(fromEmail),
        "to" -> Seq(info.email),
        "subject" -> Seq("Your order is processing"),
        "text" -> Seq(s"""Hello ${info.firstName},
Thank you for ordering your album with bigpiq, we are processing your order and will let you know when it's ready.

http://${host}/ui/${order.collectionID}

bigpiq team""")))

    res.map(_.json)
  }
}
