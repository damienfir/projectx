package bigpiq.client.components

import bigpiq.client.{RootModel, UploadFiles}
import diode.react.ModelProxy
import japgolly.scalajs.react.{ReactComponentB, BackendScope, Callback, Ref}
import org.scalajs.dom.{File, FileList}
import org.scalajs.dom.raw.HTMLInputElement
import org.scalajs.jquery.jQuery
import japgolly.scalajs.react._
import japgolly.scalajs.react.vdom.prefix_<^._

import Bootstrap._


object Upload {
  val fileInput = Ref[HTMLInputElement]("fileInput")

  class Backend($: BackendScope[ModelProxy[RootModel], Unit]) {
    def triggerClick = {
      //      jQuery.apply(fileInput($)).trigger("click")
      jQuery(fileInput($).get).trigger("click")
    }

    def filelistToList(files: FileList): List[File] = {
      new Range(0, files.length, 1).toList.map(files(_))
    }

    def triggerUpload(ev: ReactEventI) = {
      jQuery($.getDOMNode()).modal("hide")
      $.props.flatMap(_.dispatch(UploadFiles(filelistToList(ev.target.files))))
    }

    def render(p: ModelProxy[RootModel]) = {
      <.div(^.className := "modal fade", ^.id := "upload-modal",
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
                ^.onChange ==> triggerUpload
              )
            )
          )
        )
      )
    }
  }

  val component = ReactComponentB[ModelProxy[RootModel]]("Upload")
    .renderBackend[Backend]
    .build

  def apply(proxy: ModelProxy[RootModel]) = component(proxy)
}
