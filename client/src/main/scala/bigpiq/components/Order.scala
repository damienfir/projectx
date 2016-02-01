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

    def render(props: Props, state: State) = {
      <.div(^.cls := "modal fade", ^.id := "order-modal",
        <.div(^.cls := "modal-dialog",
          <.div(^.cls := "modal-content",
            <.div(^.cls := "modal-header"),

            <.div(^.cls := "modal-body",
              <.div(^.cls := "row",
                <.div(^.cls := "col-lg-12",

                  <.div(^.cls := "panel panel-default",
                    <.div(^.cls := "panel-body row",
                      <.div(^.cls := "col-lg-7",
                        <.img(^.cls := "img-responsive", ^.src := "/assets/images/a4.png")
                      ),
                      <.div(^.cls := "col-lg-5",
                        <.p("..."),
                        <.p("...")
                      )
                      // <.div(^.cls := "col-lg-2",
                      //   <.strong("Quantity"),
                      //   <.div(^.cls := "quantity"
                      //   )
                      // )
                    )
                  )
                )

                // <.div(^.cls := "col-lg-8",
                //   <.form(^.cls := "panel-body", ^.id := "order-form",
                //     <.div(^.cls := "row",
                //       <.div(^.cls := "col-lg-6 form-group",
                //         <.label(^.`for` := "firstName", "First name"),
                //         <.input(^.cls := "form-control", ^.name := "firstName")
                //       ),
                //       <.div(^.cls := "col-lg-6 form-group",
                //         <.label(^.`for` := "lastName", "Last name"),
                //         <.input(^.cls := "form-control", ^.name := "lastName")
                //       )
                //     ),

                //     <.div(^.cls := "row",
                //       <.div(^.cls := "col-lg-6 form-group",
                //         <.label(^.`for` := "email", "Email"),
                //         <.input(^.cls := "form-control", ^.name := "email")
                //       ),
                //       <.div(^.cls := "col-lg-6 form-group",
                //         <.label(^.`for` := "address", "Address"),
                //         <.input(^.cls := "form-control", ^.name := "address")
                //       )
                //     ),

                //     <.div(^.cls := "row",
                //       <.div(^.cls := "col-lg-2 form-group",
                //         <.label(^.`for` := "zip", "Zip"),
                //         <.input(^.cls := "form-control", ^.name := "zip")
                //       ),
                //       <.div(^.cls := "col-lg-5 form-group",
                //         <.label(^.`for` := "city", "City"),
                //         <.input(^.cls := "form-control", ^.name := "city")
                //       ),
                //       <.div(^.cls := "col-lg-5 form-group",
                //         <.label(^.`for` := "country", "Country"),
                //         <.input(^.cls := "form-control", ^.name := "country")
                //       )
                //     )
                //   )
                // ),

              )
            ),

            <.div(^.cls := "modal-footer",
              props.proxy().album.map(album =>
                <.a(
                ^.cls := "btn btn-primary pull-right",
                ^.href := getURL+"&item_number="+album.id,
                ^.target := "_blank",
                "Order"
              )).getOrElse(<.div()),
              <.button(
                ^.cls := "btn btn-default pull-right",
                dataToggle := "modal",
                dataTarget := "#order-modal",
                "Not now")
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
