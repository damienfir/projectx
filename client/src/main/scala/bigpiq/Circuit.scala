package bigpiq.client

import diode.react.ReactConnector
import diode.{Effect, ActionHandler, ModelRW, Circuit}
import diode.data.{Ready, Pot, PotAction, Empty}
import org.scalajs.dom.ext.Ajax
import scala.scalajs.js
import js.Dynamic.{ global => g }
import upickle.default._

import bigpiq.shared._

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global


case class CreateUser()
case class GetUser(id: Long)
case class UpdateUser(user: User)
case class GetFromCookie()


class UserHandler[M](modelRW: ModelRW[M, Pot[User]]) extends ActionHandler(modelRW) {

  def getUser(id: Long) = Effect(Ajax.get(s"/users/$id").map(r => UpdateUser(read[User](r.responseText))))
  def createUser() = Effect(Ajax.post(s"/users/").map(r => UpdateUser(read[User](r.responseText))))
  def getFromCookie() = Effect(Future(GetUser(42)))

  override def handle = {
    case UpdateUser(user) =>
      g.console.log(s"got user $user")
      updated(Ready(user))
    case GetUser(id) => effectOnly(getUser(id))
    case CreateUser => effectOnly(createUser())
    case GetFromCookie =>
      g.console.log("ok")
      effectOnly(getFromCookie())
  }
}


object AppCircuit extends Circuit[RootModel] with ReactConnector[RootModel] {
  override protected var model: RootModel = RootModel(Empty)

  val userHandler = new UserHandler(zoomRW(_.user)((m,v) => m.copy(user = v)))
  override protected def actionHandler: AppCircuit.HandlerFunction = combineHandlers(userHandler)
}