package bigpiq.client.views

import bigpiq.client.{GetFromHash, UploadFiles, GetFromCookie, RootModel}
import bigpiq.shared._
import diode.react.ModelProxy
import japgolly.scalajs.react.vdom.prefix_<^._
import japgolly.scalajs.react._
import org.scalajs.dom.raw.MouseEvent
import org.scalajs.dom.raw.{FileList, Event, HTMLInputElement, File}
import org.scalajs.jquery._
import diode.react.ReactPot._

import scala.scalajs.js.Dynamic.{global => g}


object UI {
  def icon(style: String) = <.i(^.cls := "fa fa-"+style)
}


object Root {

  class Backend($: BackendScope[ModelProxy[RootModel], Unit]) {

    def mounted(proxy: ModelProxy[RootModel]) = {
      proxy.dispatch(GetFromCookie)
    }

    def render(proxy: ModelProxy[RootModel]) = {
      val dataToggle = "data-toggle".reactAttr
      val dataTarget = "data-target".reactAttr

      <.div(^.className := "theme-blue",
        <.button(^.className := "btn btn-primary",
          dataToggle := "modal",
          dataTarget := "#upload-modal",
          "Upload"
        ),
        proxy.connect(identity)(p => Album(Album.Props(p))),
        proxy.connect(identity)(Upload(_))
      )
    }
  }

  val component = ReactComponentB[ModelProxy[RootModel]]("Root")
    .renderBackend[Backend]
    .componentDidMount(scope => scope.backend.mounted(scope.props))
    .build

  def apply(proxy: ModelProxy[RootModel]) = component(proxy)
}


object Upload {
  val fileInput = Ref[HTMLInputElement]("fileInput")

  class Backend($: BackendScope[ModelProxy[RootModel], Unit]) {
    def triggerClick() = {
//      jQuery.apply(fileInput($)).trigger("click")
      jQuery.apply("#file-input").trigger("click")
    }

    def filelistToList(files: FileList): List[File] = {
      (new Range(0, files.length, 1).toList.map(files(_)))
    }

    def triggerUpload(proxy: ModelProxy[RootModel])(ev: ReactEventI) = {
      proxy.dispatch(UploadFiles(filelistToList(ev.target.files)))
    }

    def render(p: ModelProxy[RootModel]) = {
      <.div(^.className := "modal fade", ^.id := "upload-modal",
        <.div(^.className := "modal-dialog",
          <.div(^.className := "modal-content", ^.id := "upload-area", ^.onClick --> Callback(triggerClick),
            <.div(^.className := "modal-body",
              <.div(^.className := "message", "Click here to upload"),
              <.i(^.className := "fa fa-download fa-3x"),
              <.input(^.id := "file-input",
                ^.`type` := "file",
                ^.name := "image",
                ^.multiple := true,
                ^.ref := Ref("file-input"),
                ^.onChange ==> triggerUpload(p)
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


object Album {
  case class Props(proxy: ModelProxy[RootModel])

  class Backend($: BackendScope[Props, Unit]) {
    val dataPage = "data-page".reactAttr
    val dataIdx = "data-index".reactAttr

    val blankpage = Composition(0, 0, -2, List())
    val coverpage = Composition(0, 0, 0, List())

    def toSpreads(pages: List[Composition]): List[List[Composition]] = {
      val pages2: List[Composition] = pages match {
        case Nil => List(coverpage)
        case head :: tail => head +: blankpage +: tail :+ blankpage
      }

      List(pages2.head) +: pages2.tail.grouped(2).toList
    }

    def renderBackside() = <.div(^.cls := "backside", "bigpiq")

    def pct(x: Double): String = (x*100.0) + "%"

    def renderTile(page: Int)(t: Tuple2[Tile, Int]) = t match { case (tile, index) => {
      val scaleX = 1.0 / (tile.cx2 - tile.cx1)
      val scaleY = 1.0 / (tile.cy2 - tile.cy1)

      < div(^.cls := "ui-tile",
        ^.height := pct(tile.ty2-tile.ty1),
        ^.width  := pct(tile.tx2-tile.tx1),
        ^.top    := pct(tile.ty1),
        ^.left  := pct(tile.tx1),
        dataPage := page,
        dataIdx  := index,
        < img(^.src := "/photos/"+tile.photoID+"/full/800,/"+tile.rot+"/default.jpg",
          ^.draggable := false,
          ^.height := pct(scaleY),
          ^.width  := pct(scaleX),
          ^.top    := pct(-tile.cy1 * scaleY),
          ^.left   := pct(-tile.cx1 * scaleX)
        )
      )
    }}


    def render(p: Props) = <.div(^.cls:="container-fluid album",
      p.proxy().album.render { pages =>
        toSpreads(pages).zipWithIndex.map({ case (spread, i) => {
          val isCover = spread.length == 1 && spread(0).index == 0
          < div(^.cls := "row spread "+(if (isCover) "spread-cover" else ""),
            < a(
              ^.cls := "spread-anchor",
              ^.name := "spread" + i
              ),
            if (isCover)
              < div(^.cls := "col-xs-1 spread-arrow",
                < a(^.cls := "btn btn-link", ^.href := "#spread"+(i-1)),
                UI.icon("chevron-left fa-3x")
                )
            else "",

            < div(^.cls := "spread-paper shadow clearfix " +
              (if (isCover) "col-xs-6 col-xs-offset-3" else "col-xs-10"),
              spread.zipWithIndex.map({case (page, j) => {
                val pull = if ((j*2+i % 2) == 0) "pull-right" else "pull-left"
                < div(^.cls := "box-mosaic " + pull, dataPage := page.index,
                  if (j == 0 && i == 1) renderBackside() else {
                    page.tiles.zipWithIndex.map(renderTile(page.index))
                  })
              }})
              ),

            < div(^.cls := "col-xs-1 spread-arrow",
              < a(^.cls := "btn btn-link", ^.href := "#spread"+(i+1)),
              UI.icon("chevron-right fa-3x")
              ),

            < div(^.cls := "spread-btn clearfix " +
              (if (isCover) "col-xs-6 col-xs-offset-3" else "col-xs-10 col-xs-offset-1")
              )
            )
        }})
      }
    )
  }

  val component = ReactComponentB[Props]("Album")
    .renderBackend[Backend]
    .build

  def apply(props: Props) = component(props)
}
