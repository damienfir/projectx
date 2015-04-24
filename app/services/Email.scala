package services

import scala.concurrent.Future
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import play.api.Play

import java.util.Properties;
import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.AddressException;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;


case class Email(address: Option[String], mosaic_id: Option[String])


object EmailService {
  val host = Play.current.configuration.getString("px.host").get

  def send(email: Email) = Future {
    val props = new Properties()
    val session = Session.getDefaultInstance(props, null)

    val url = s"http://$host/${email.mosaic_id.get}"

    try {
      val msg = new MimeMessage(session)
      msg.setFrom(new InternetAddress(s"info@$host", "bigpiq team"))
      msg.addRecipient(Message.RecipientType.TO,
        new InternetAddress(email.address.get))
      msg.setSubject("Link to your bigpiq")
      msg.setText(s"""
        Hello,

        Thank you for trying out our service, here is the link to view your bigpiq:
        $url

        Respectfully yours,
        bigpiq team
      """)
      Transport.send(msg)
    } catch {
      case e: AddressException => println(e)
      case e: MessagingException => println(e)
    }
  }
}
