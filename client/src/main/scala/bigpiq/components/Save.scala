package bigpiq.client.components

import bigpiq.client._
import org.scalajs.dom
import org.scalajs.dom.raw.HTMLInputElement
import diode.react.ModelProxy
import japgolly.scalajs.react.vdom.prefix_<^._
import japgolly.scalajs.react.{BackendScope, ReactComponentB, _}


object Save {

  val dataToggle = "data-toggle".reactAttr
  val dataTarget = "data-target".reactAttr

  case class Props(proxy: ModelProxy[RootModel])

  case class State()

  class Backend($: BackendScope[Props, State]) {

    val emailInput = Ref[HTMLInputElement]("email")

    def render(props: Props, state: State) = {
      <.div(^.cls := "modal fade", ^.id := "save-modal",
        <.div(^.cls := "modal-dialog modal-lg",
          <.div(^.cls := "modal-content",
            <.div(^.cls := "modal-header"),

            <.div(^.cls := "modal-body",
              <.input(^.cls := "input-control", ^.placeholder := "Email address", ^.ref := "email")
            ),

            <.div(^.cls := "modal-footer",
              <.button(^.cls := "btn btn-primary pull-right",
                ^.onClick --> props.proxy.dispatch(EmailAndSave(emailInput($).get.value)),
                "Save"
              ),
              <.button(
                ^.cls := "btn btn-default pull-right",
                dataToggle := "modal",
                dataTarget := "#save-modal",
                "Cancel")
            )
          )
        )
      )
    }
  }

  def apply(props: Props) = ReactComponentB[Props]("Order")
    .initialState(State())
    .renderBackend[Backend]
    .build
    .apply(props)
}
