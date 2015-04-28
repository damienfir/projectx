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


// case class Email(address: Option[String], mosaic_id: Option[String])


object EmailService {
  val host = Play.current.configuration.getString("px.host").get

  def send(to: InternetAddress, from: InternetAddress, subject: String, text: String) = Future {
    val props = new Properties()
    val session = Session.getDefaultInstance(props, null)

    try {
      val msg = new MimeMessage(session)
      msg.setFrom(from)
      msg.addRecipient(Message.RecipientType.TO, to)
      msg.setSubject(subject)
      msg.setText(text)
      Transport.send(msg)
    } catch {
      case e: AddressException => println(e)
      case e: MessagingException => println(e)
    }
  }


  def sendToSelf(email: String, mosaic_id: String) = {
    val msg = s"""
      Hello,

      Thank you for trying out our service, here is the link to view your bigpiq:
      http://$host/$mosaic_id

      Respectfully yours,
      bigpiq team
    """
    send(new InternetAddress(email), new InternetAddress(s"info@$host", "bigpiq team"), "Link to your bigpiq", msg)
  }


  def sendToFriend(to: String, from: String, mosaic_id: String) = {
    val msg = s"""
      Hello,

      I created a bigpiq and I'd like to share it with you. Click on the following link to see it:
      http://$host/$mosaic_id

      Kindest always
    """
    send(new InternetAddress(to), new InternetAddress(from), "bigpiq", msg)
  }
}
