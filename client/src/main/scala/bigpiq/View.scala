package bigpiq.client.views

import japgolly.scalajs.react.vdom.prefix_<^._
import bigpiq.client.{GetFromCookie, RootModel}
import diode.react.ModelProxy
import scala.scalajs.js
import js.Dynamic.{ global => g }

import japgolly.scalajs.react.{BackendScope, ReactComponentB}


object Root {

  def mounted(proxy: ModelProxy[RootModel]) = {
    g.console.log("mounted")
    proxy.dispatch(GetFromCookie())
  }

  val component = ReactComponentB[ModelProxy[RootModel]]("Root")
    .render(_ => <.div("Hello"))
    .componentDidMount(scope => mounted(scope.props))
    .build

  def apply(proxy: ModelProxy[RootModel]) = component(proxy)
}
