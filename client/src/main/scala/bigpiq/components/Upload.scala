package bigpiq.client.components

import bigpiq.client.{CancelUploadRequest, RequestUploadAfter, RootModel, UploadFiles}
import diode.react.ModelProxy
import japgolly.scalajs.react.{BackendScope, Callback, ReactComponentB, Ref}
import org.scalajs.dom.{File, FileList}
import org.scalajs.dom.raw.HTMLInputElement
import org.scalajs.jquery.{JQueryEventObject, jQuery}
import japgolly.scalajs.react._
import japgolly.scalajs.react.vdom.prefix_<^._
import Bootstrap._


object Upload {
  val fileInput = Ref[HTMLInputElement]("fileInput")

  case class Props(proxy: ModelProxy[RootModel])
  case class State(page: Int = 0)

  class Backend($: BackendScope[Props, State]) {
    def showModal(page: Int) = $.modState(_.copy(page=page), Callback(show))

    def triggerClick = {
      //      jQuery.apply(fileInput($)).trigger("click")
      jQuery(fileInput($).get).trigger("click")
    }

    def filelistToList(files: FileList): List[File] = {
      new Range(0, files.length, 1).toList.map(files(_))
    }

    def triggerUpload(ev: ReactEventI) = {
      //      $.props.flatMap(p => p.uploadFunc(filelistToList(ev.target.files)))
      $.props.flatMap(props =>
        props.proxy.dispatch(RequestUploadAfter(0)) >>
        props.proxy.dispatch(UploadFiles(filelistToList(ev.target.files)))) >>
        Callback(hide)
    }

    def render(p: Props) = {
      <.div(
        ^.className := "modal fade",
        ^.id := "upload-modal",
        <.div(^.className := "modal-dialog",
          <.div(^.className := "modal-content", ^.id := "upload-area",
            ^.onClick --> Callback(triggerClick),
            <.div(^.className := "modal-body",
              <.div(^.className := "message", "Click here to upload"),
              <.i(^.className := "fa fa-download fa-3x"),
              <.input(^.id := "file-input",
                ^.`type` := "file",
                ^.name := "image",
                ^.multiple := true,
                ^.ref := Ref("fileInput"),
                ^.onChange ==> triggerUpload)))))
    }

    def cancelUpload = $.props.flatMap(_.proxy.dispatch(CancelUploadRequest))

    def didMount = Callback {
      jQuery($.getDOMNode()).on("hidden.bs.modal", (ev: JQueryEventObject) => cancelUpload.runNow())
    }
  }

  def show = jQuery("#upload-modal").modal("show")

  def hide = jQuery("#upload-modal").modal("hide")

  def apply(props: Props) = ReactComponentB[Props]("Upload")
    .initialState(State())
    .renderBackend[Backend]
//    .componentDidMount(scope => scope.backend.didMount)
    .build
    .apply(props)
}
