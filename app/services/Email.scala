package services

import javax.inject.Inject
import scala.concurrent.Future
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import play.api.Play
import play.api.libs.ws._

import models._


class Email @Inject()(ws: WSClient) {
  def confirmOrder(order: APIModels.Order, info: APIModels.Info) = {
    val res = ws.url("https://api.mailgun.net/v3/bigpiq.com/messages")
      .withAuth("api", "key-7bcc0fadb06fd8bd854c291696e0128f", WSAuthScheme.BASIC)
      .post(Map(
        "from" -> Seq("Damien <fir.damien@gmail.com>"),
        "to" -> Seq(info.email),
        "subject" -> Seq("Your order is processing"),
        "text" -> Seq(s"""Hello ${info.firstName},
Thank you for ordering your album with bigpiq, we are processing your order and will let you know when it's ready.

http://bigpiq.com/ui/${order.collectionID}

bigpiq team""")))

    res.map(_.json)
  }
}
