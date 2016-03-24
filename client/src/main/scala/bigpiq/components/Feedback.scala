package bigpiq.client.components

import bigpiq.client.components.Album.State
import bigpiq.shared.Album
import diode.data.Pot
import diode.react.ModelProxy
import japgolly.scalajs.react.{BackendScope, ReactComponentB}
import japgolly.scalajs.react.vdom.prefix_<^._


object Feedback {

  case class Props(proxy: ModelProxy[Pot[Album]])

  class Backend($: BackendScope[Props, Unit]) {

    def render(p: Props) =
      <.form (
//        ^.onSubmit --> p.proxy.dispatch(SendFeedback()
//          <.textarea(),
//        <.button( "Send")
      )

  }

  def apply(props: Props) = ReactComponentB[Props]("Album")
    .renderBackend[Backend]
    .build
    .apply(props)
}
