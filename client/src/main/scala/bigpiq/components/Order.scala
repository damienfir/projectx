package bigpiq.client.components

import bigpiq.client.RootModel
import org.scalajs.dom
import diode.react.ModelProxy
import japgolly.scalajs.react.vdom.prefix_<^._
import japgolly.scalajs.react.{BackendScope, ReactComponentB, _}


object Order {

  val dataToggle = "data-toggle".reactAttr
  val dataTarget = "data-target".reactAttr
  val dataDismiss = "data-dismiss".reactAttr

  case class Props(proxy: ModelProxy[RootModel])

  case class State()

  class Backend($: BackendScope[Props, State]) {

    def getURL = dom.document.getElementById("url").attributes.getNamedItem("value").value

    def render(props: Props, state: State) = {
      <.div(^.cls := "modal fade", ^.id := "order-modal",
        <.div(^.cls := "modal-dialog modal-sm",
          <.div(^.cls := "modal-content",
            <.div(^.cls := "modal-header",
              <.button(^.cls := "close", dataDismiss := "modal", "x")
            ),

            <.div(^.cls := "modal-body",
//              <.div(^.cls := "row",
//                <.div(^.cls := "col-lg-6 col-lg-offset-4",
                  <.img(^.cls := "img-responsive", ^.src := "/assets/images/a4.png")
//                )
//              )
            ),

            <.div(^.cls := "modal-footer",
              <.div(^.cls := "pull-right",
                <.strong("CHF 39.00"),
                props.proxy().album.map(album =>
                  <.a(
                    ^.cls := "btn btn-primary",
                    ^.href := getURL+"&item_number="+album.id,
                    ^.target := "_blank",
                    UI.icon("shopping-cart"),
                    " Order now"
                  )).getOrElse(<.div())
              )
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
