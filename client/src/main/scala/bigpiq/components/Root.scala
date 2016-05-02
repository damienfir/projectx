package bigpiq.client.components

import bigpiq.client.{GetFromCookie, RootModel, UploadState}
import diode.react.ModelProxy
import japgolly.scalajs.react.{BackendScope, ReactComponentB}
import japgolly.scalajs.react.vdom.prefix_<^._


object Root {

  class Backend($: BackendScope[ModelProxy[RootModel], Unit]) {

    def mounted(proxy: ModelProxy[RootModel]) = {
      proxy.dispatch(GetFromCookie)
    }

    def render(proxy: ModelProxy[RootModel]) = {
      <.div(^.className := "theme-blue",
        proxy.connect(identity)(Nav(_)),
        proxy.connect(_.album)(p => Album(Album.Props(p))),
        proxy.connect(identity)(p => Order(Order.Props(p))),
        proxy.connect(identity)(p => Upload(Upload.Props(p))),
        proxy.connect(identity)(p => Save(Save.Props(p)))
//        proxy.wrap(_.album)(p => Feedback(Feedback.Props(p)))
      )
    }
  }

  val component = ReactComponentB[ModelProxy[RootModel]]("Root")
    .renderBackend[Backend]
    .componentDidMount(scope => scope.backend.mounted(scope.props))
    .build

  def apply(proxy: ModelProxy[RootModel]) = component(proxy)
}
