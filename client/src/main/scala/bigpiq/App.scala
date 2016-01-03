package bigpiq.client

import bigpiq.client.views.Root
import japgolly.scalajs.react.{ReactComponentB, ReactDOM}
import org.scalajs.dom

import scala.scalajs.js
import scala.scalajs.js.annotation.JSExport


@JSExport("App")
object App extends js.JSApp {
  @JSExport
  override def main(): Unit = {

    val connectedRoot = AppCircuit.connect(m => m)(p => Root(p))

    ReactDOM.render(connectedRoot, dom.document.getElementById("app"))
  }
}