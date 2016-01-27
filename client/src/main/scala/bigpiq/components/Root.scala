package bigpiq.client.components

import bigpiq.client.{GetFromCookie, RootModel}
import diode.react.ModelProxy
import japgolly.scalajs.react.{BackendScope, ReactComponentB}
import japgolly.scalajs.react.vdom.prefix_<^._


object Root {

  class Backend($: BackendScope[ModelProxy[RootModel], Unit]) {
    val dataToggle = "data-toggle".reactAttr
    val dataTarget = "data-target".reactAttr

    def mounted(proxy: ModelProxy[RootModel]) = {
      proxy.dispatch(GetFromCookie)
    }

    // val mouseUp$ = PublishSubject[CoordEvent]()
    // val mouseMove$ = PublishSubject[CoordEvent]()

    def render(proxy: ModelProxy[RootModel]) = {
      <.div(^.className := "theme-blue",
        // ^.onMouseUp ==> ((ev: ReactMouseEvent) => Callback(mouseUp$.onNext(CoordEvent(0, 0, ev, jQuery(ev.target))))),
        // ^.onMouseMove ==> ((ev: ReactMouseEvent) => Callback(mouseMove$.onNext(CoordEvent(0, 0, ev, jQuery(ev.target))))),
//        <.button(^.cls := "btn btn-primary", dataToggle := "modal", dataTarget := "#upload-modal"),
        proxy.connect(identity)(Nav(_)),
        proxy.connect(identity)(p => Album(Album.Props(p))),
        proxy.connect(identity)(p => Order(Order.Props(p))),
        proxy.connect(identity)(Upload(_)),
        proxy.connect(identity)(p => Save(Save.Props(p)))
      )
    }
  }

  val component = ReactComponentB[ModelProxy[RootModel]]("Root")
    .renderBackend[Backend]
    .componentDidMount(scope => scope.backend.mounted(scope.props))
    .build

  def apply(proxy: ModelProxy[RootModel]) = component(proxy)
}
