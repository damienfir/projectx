package bigpiq.client.components

import scala.scalajs.js._
import org.scalajs.jquery.{JQuery, jQuery}
import japgolly.scalajs.react._
import japgolly.scalajs.react.vdom.prefix_<^._


object UI {
  def icon(style: String) = <.i(^.cls := "fa fa-"+style)
}


object Bootstrap {
  @scalajs.js.native
  trait BootstrapJQuery extends JQuery {
    def modal(action: String): BootstrapJQuery = scalajs.js.native
    def modal(options: scalajs.js.Any): BootstrapJQuery = scalajs.js.native
  }

  implicit def jq2bootstrap(jq: JQuery): BootstrapJQuery = jq.asInstanceOf[BootstrapJQuery]
}
