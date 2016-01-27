package bigpiq.client.components

import bigpiq.client.{RootModel, SaveAlbum}
import bigpiq.shared.Collection
import diode.data.Ready
import diode.react.ModelProxy
import japgolly.scalajs.react.BackendScope
import japgolly.scalajs.react._
import japgolly.scalajs.react.vdom.prefix_<^._
import org.scalajs.jquery._
import org.scalajs.dom
import org.scalajs.dom.raw


object Nav {
  class Backend($: BackendScope[ModelProxy[RootModel], Unit]) {
    val dataToggle = "data-toggle".reactAttr
    val dataTarget = "data-target".reactAttr

    def didMount = {
      jQuery(dom.window).scroll { ev: JQueryEventObject =>
        if (jQuery(dom.document).scrollTop() == 0)
        jQuery("#nav").removeClass("shadow-lg") else
        jQuery("#nav").addClass("shadow-lg")
      }
    }

    def onSave = $.props.flatMap(_.dispatch(SaveAlbum))

    def render(proxy: ModelProxy[RootModel]) = {
      val isDemo = proxy().collection match {
        case Ready(Collection(_, _, hash)) => hash.equals("")
        case _ => false
      }
      val loaded = proxy().album match {
        case Ready(album) => album.nonEmpty && !isDemo
        case _ => false
      }
      <.div(^.cls := "nav navbar-transparent navbar-fixed-top", ^.id := "nav",
        <.div(^.cls := "container-fluid",
          <.ul(^.cls := "nav navbar-nav",
            <.li(<.a(^.cls := "navbar-brand", ^.href := "/", "bigpiq"))
          ),

          //          if (loaded) {
          <.ul(^.cls := "nav navbar-nav",
            <.li(
              <.button(^.cls := "btn btn-primary navbar-btn", ^.id := "upload-btn",
                dataToggle := "modal",
                dataTarget := "#upload-modal",
                UI.icon("cloud-upload"), " Upload more photos"
              )
            )
          ),
          //          } else "",

          if (isDemo) {
            <.li(
              <.a(^.cls := "btn navbar-btn btn-info",
                ^.href := "/ui",
                UI.icon("flask"),
                " Try"
              ))
          } else "",

          if (loaded) {
            <.ul(^.cls := "nav navbar-nav navbar-right",
              <.li(
                <.button(^.cls := "btn btn-primary navbar-btn",
                  // ^.onClick --> onSave,
                  dataToggle := "modal",
                  dataTarget := "#save-modal",
                  UI.icon("heart-o"), " Save"
                )
              ),
              <.li(
                <.button(^.cls := "btn btn-primary navbar-btn",
                  dataTarget := "#order-modal",
                  dataToggle := "modal",
                  UI.icon("shopping-cart"), " Buy"
                )
              )
            )
          } else ""
        )
      )
    }
  }

  def apply(proxy: ModelProxy[RootModel]) = ReactComponentB[ModelProxy[RootModel]]("Nav")
    .renderBackend[Backend]
    .componentDidMount(scope => Callback(scope.backend.didMount))
    .build.apply(proxy)
}
