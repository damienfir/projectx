package bigpiq.client.components

import bigpiq.client.RootModel
import org.scalajs.dom
import diode.react.ModelProxy
import japgolly.scalajs.react.vdom.prefix_<^._
import japgolly.scalajs.react.{BackendScope, ReactComponentB, _}


object Order {

  val dataToggle = "data-toggle".reactAttr
  val dataTarget = "data-target".reactAttr

  case class Props(proxy: ModelProxy[RootModel])

  // case Address(
  //   firstName: String,
  //   lastName: String,

  // )

  case class State()

  class Backend($: BackendScope[Props, State]) {

    def getURL = dom.document.getElementById("url").attributes.getNamedItem("value").value

    def render(props: Props, state: State) = props.proxy().album.map { album =>
      <.div(^.cls := "modal fade", ^.id := "order-modal",
        <.div(^.cls := "modal-dialog",
          <.div(^.cls := "modal-content",
            <.div(^.cls := "modal-header"),

            <.div(^.cls := "modal-body",
              <.div(^.cls := "row",
                <.div(^.cls := "col-lg-5",
                  <.img(^.cls := "img-responsive", ^.src := "/assets/images/a4.png")
                ),
                <.div(^.cls := "col-lg-7",
                  <.table(^.cls := "table",
                    <.thead(
                      <.tr(<.th(^.colSpan := 2, "Hardcover photo book"))),
                    <.tbody(
                      <.tr(<.td("Number of pages"), <.td(album.pages.length)),
                      <.tr(<.td("Glossy paper"), <.td("200g/m", <.sup("2"))),
                      <.tr(<.td("Price per book"), <.td(<.strong("CHF 39.00"))),
                      <.tr(<.td(), <.td(<.strong("Free shipping")))
                    )
                  )
                )
              )
            ),

            <.div(^.cls := "modal-footer",
              <.div(^.cls := "pull-right",
                <.a(
                  ^.cls := "btn btn-primary",
                  ^.href := getURL+"&item_number="+album.id,
                  ^.target := "_blank",
                  UI.icon("shopping-cart"),
                  " Order"
                )
              ),
              <.button(
                ^.cls := "btn btn-default btn-sm pull-left",
                dataToggle := "modal",
                dataTarget := "#order-modal",
                UI.icon("arrow-left"),
                " Not now")
            )
          )
        )
      )
    } getOrElse <.div()
  }

  def apply(props: Props) = ReactComponentB[Props]("Order")
    .initialState(State())
    .renderBackend[Backend]
    .build
    .apply(props)
}
