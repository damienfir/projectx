package bigpiq.client.views

import bigpiq.client._
import bigpiq.shared._
import diode.react.ModelProxy
import diode.react.ReactPot._
import japgolly.scalajs.react._
import japgolly.scalajs.react.vdom.prefix_<^._
import monifu.concurrent.Cancelable
import monifu.concurrent.Implicits.globalScheduler
import monifu.concurrent.cancelables.BooleanCancelable
import monifu.reactive.subjects.PublishSubject
import org.scalajs.dom.raw._
import org.scalajs.jquery._

import scala.collection.immutable.Range
import scala.scalajs.js.Dynamic.{global => g}


object UI {
  def icon(style: String) = <.i(^.cls := "fa fa-"+style)
}

case class CoordEvent(x: Double, y: Double, w: Double, h: Double, idx: Int, page: Int)
object CoordEvent {
  def apply(page: Int, idx: Int, ev: ReactMouseEvent): CoordEvent = {
    ev.preventDefault()
    ev.stopPropagation()
      CoordEvent(
        x = ev.screenX,
        y = ev.screenY,
        w = jQuery(ev.target).width(),
        h = jQuery(ev.target).height(),
        idx = idx,
        page = page
      )
  }
}

case class Move(dx: Double, dy: Double, coordEvent: CoordEvent)

object Root {

  class Backend($: BackendScope[ModelProxy[RootModel], Unit]) {
    val dataToggle = "data-toggle".reactAttr
    val dataTarget = "data-target".reactAttr

    def mounted(proxy: ModelProxy[RootModel]) = {
      proxy.dispatch(GetFromCookie)
    }

    val mouseUp$ = PublishSubject[Unit]()
    val mouseMove$ = PublishSubject[CoordEvent]()

    def render(proxy: ModelProxy[RootModel]) = {
      <.div(^.className := "theme-blue",
        ^.onMouseUp --> Callback(mouseUp$.onNext()),
        ^.onMouseMove ==> ((ev: ReactMouseEvent) => Callback(mouseMove$.onNext(CoordEvent(0, 0, ev)))),
        <.button(^.cls := "btn btn-primary", dataToggle := "modal", dataTarget := "#upload-modal"),
        proxy.connect(identity)(p => Album(Album.Props(p, mouseUp$, mouseMove$))),
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
      jQuery(fileInput($).get).trigger("click")
    }

    def filelistToList(files: FileList): List[File] = {
      new Range(0, files.length, 1).toList.map(files(_))
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
                ^.ref := Ref("fileInput"),
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


class AlbumUI($: BackendScope[Album.Props, Album.State], updateAlbum: List[Composition] => Callback) {

  var down : Option[CoordEvent] = None
  var prevMove : Option[CoordEvent] = None

  def mouseDown(ev: CoordEvent) = down = Some(ev)

  def mouseUp() = down = None

  def mouseMove(curr: CoordEvent) : Callback = down match {
    case Some(down) => prevMove match {
      case Some(prev) => {
        prevMove = Some(curr)
        val m = Move(
          dx = (curr.x - prev.x) / down.w,
          dy = (curr.y - prev.y) / down.h,
          down
        )
        $.props.flatMap(p => p.proxy.dispatch(MoveTile(m)))
      }
      case None => {
        prevMove = Some(curr)
        Callback(None)
      }
    }
    case None => Callback(None)
  }

  $.props.map(_.mouseUp.foreach(_ => mouseUp())).runNow()
  $.props.map(_.mouseMove.foreach(ev => mouseMove(ev))).runNow()

}


object Album {
  case class Props(proxy: ModelProxy[RootModel], mouseUp: PublishSubject[Unit], mouseMove: PublishSubject[CoordEvent])
  case class Editing(selected: Option[Composition] = None)
  case class State(editing: Editing)
  case class Node(x: Float, y: Float)


  class Backend($: BackendScope[Props, State]) {
    val albumUI = new AlbumUI($, updateAlbum)

    val dataPage = "data-page".reactAttr
    val dataIdx = "data-index".reactAttr
    val dataToggle = "data-toggle".reactAttr
    val dataTarget = "data-target".reactAttr

    val blankpage = Composition(0, 0, -2, List())
    val coverpage = Composition(0, 0, 0, List())

    def updateAlbum(album: List[Composition]) = $.props flatMap (_.proxy.dispatch(TestAction))

    def toSpreads(pages: List[Composition]): List[List[Composition]] = {
      val pages2: List[Composition] = pages match {
        case Nil => List(coverpage)
        case head :: tail => head +: blankpage +: tail :+ blankpage
      }

      List(pages2.head) +: pages2.tail.grouped(2).toList
    }

    def pct(x: Double): String = (x*100.0) + "%"

    def backside() = <.div(^.cls := "backside", "bigpiq")

    def tile(page: Int)(t: (Tile, Int)) = t match { case (tile, index) => {
      val scaleX = 1.0 / (tile.cx2 - tile.cx1)
      val scaleY = 1.0 / (tile.cy2 - tile.cy1)

      < div(^.cls := "ui-tile",
        ^.key := tile.photoID,
        ^.height := pct(tile.ty2-tile.ty1),
        ^.width  := pct(tile.tx2-tile.tx1),
        ^.top    := pct(tile.ty1),
        ^.left  := pct(tile.tx1),
        ^.onMouseDown ==> ((ev: ReactMouseEvent) => Callback(albumUI.mouseDown(CoordEvent(page, index, ev)))),
        ^.onMouseMove ==> ((ev: ReactMouseEvent) => albumUI.mouseMove(CoordEvent(page, index, ev))),
        ^.onMouseUp ==> ((ev: ReactMouseEvent) => Callback(albumUI.mouseUp())),
        < img(^.src := "/photos/"+tile.photoID+"/full/800,/"+tile.rot+"/default.jpg",
          ^.draggable := false,
          ^.height := pct(scaleY),
          ^.width  := pct(scaleX),
          ^.top    := pct(-tile.cy1 * scaleY),
          ^.left   := pct(-tile.cx1 * scaleX)
        )
      )
    }}

    def buttons(row: Int)(t: (Composition, Int)) = t match { case (page, col) => {
      val p = row*2+col
      val pull = if ((p % 2) == 0) "pull-left" else "pull-right"
      <.div(^.cls := pull, ^.key := page.index,
        <.span(^.cls := "page", dataPage := page.index, if (p == 0) "Cover Page" else s"Page ${p-1}"),
        if (page.tiles.length > 1)
          <.div(^.cls := "btn-group",
            <.button(^.cls := "btn btn-primary shuffle-btn",
              dataPage := page.index,
              ^.disabled := false,
              UI.icon("refresh"),
              " Shuffle"
            )
          )
        else ""
      )
    }}

    def arrow(direction: String, row: Int) =
      <.div(^.cls := "col-xs-1 spread-arrow",
        <.a(^.cls := "btn btn-link", ^.href := "#spread"+row,
          UI.icon(s"chevron-$direction fa-3x")
        )
      )

    def title(collection: Collection) =
      <.input(^.cls := "cover-title",  ^.id := "album-title",
        ^.`type` := "text",
        ^.placeholder := "Album title",
        ^.maxLength := 50,
        ^.value := collection.name,
        ^.autoComplete := false
      )


    def drawNode(shift: Float)(node: Node) =
      <.button(
        ^.cls := "node shadow",
        ^.top := pct(node.y + shift),
        ^.left := pct(node.x + shift)
      )

    def nodes(page: Composition) = {
      val shift = 0.3e-2f
      val topLeft = page.tiles
        .filter(t => t.tx1 > 0.01 || t.ty1 > 0.01)
        .map(t => Node(t.tx1, t.ty1))
      val bottomRight = page.tiles
        .filter(t => t.tx2 < 0.99 || t.ty2 < 0.99)
        .map(t => Node(t.tx2, t.ty2))
        .filter(a => !topLeft.exists(b => (Math.abs(a.x - b.x) + Math.abs(a.y - b.y)) < 0.1))
      bottomRight.map(drawNode(shift)) ++ topLeft.map(drawNode(-shift))
    }

    def addPhotosStart() =
      <.button(^.cls := "btn btn-info btn-lg btn-step center shadow",
        ^.id := "create-btn",
        dataToggle := "modal",
        dataTarget := "#upload-modal",
        UI.icon("cloud-upload"), "Upload photos"
      )

    def addPhotosEnd(col: Collection) =
      <.button(^.cls := "btn btn-primary center", ^.id := "addmore-btn",
        dataToggle := "modal",
        dataTarget := "#upload-modal",
        UI.icon("cloud-upload"), "Upload more photos"
      )

    def toolbar(page: Composition) =
      <.div(^.cls := "btn-group toolbar",
        if (page.tiles.length > 1)
          <.button(^.cls := "btn btn-info btn-lg", ^.id := "remove-btn",
            UI.icon("trash-o")
          )
        else "",
        <.button(^.cls := "btn btn-info btn-lg", ^.id := "rotate-btn",
          UI.icon("rotate-right")
        ),
        if (page.index != 0)
          <.button(^.cls := "btn btn-info btn-lg", ^.id := "add-cover-btn",
            UI.icon("book")
          )
        else "",
        <.button(^.cls := "btn btn-info btn-lg", ^.id := "cancel-btn",
          UI.icon("times")
        )
      )

    def hover(page: Composition) =
      <.div(^.cls := "page-hover",
        dataPage := page.index,
        dataIdx := 0,
        <.h2(^.cls := "center", if (page.index == 0) "Copy here" else "Move here")
      )

    def render(p: Props, s: State) = <.div(^.cls:="container-fluid album",
      p.proxy().album.render { pages =>
        toSpreads(pages).zipWithIndex.map({ case (spread, row) => {
          val isCover = spread.length == 1 && spread(0).index == 0
          < div(^.cls := "row spread "+(if (isCover) "spread-cover" else ""),

            < a(^.cls := "spread-anchor",
              ^.name := "spread" + row
              ),

            if (!isCover) arrow("left", row-1) else "",

            < div(^.cls := "spread-paper shadow clearfix " +
              (if (isCover) "col-xs-6 col-xs-offset-3" else "col-xs-10"),
              spread.zipWithIndex.map({case (page, col) => {
                val cls = "box-mosaic " + (if ((row*2+col) % 2 == 0) "pull-left" else "pull-right")
                  if (col == 0 && row == 1)
                    < div(^.cls := cls, dataPage := page.index, ^.key := page.index, backside())
                  else
                    < div(^.cls := cls, dataPage := page.index, ^.key := page.index,
                      page.tiles.zipWithIndex.map(tile(page.index)),
                      if (page.index == 0) p.proxy().collection.render(col => title(col)) else "",
                      nodes(page),
                      if (page.tiles.isEmpty) {
                        if (page.index == 0)
                          p.proxy().collection.renderEmpty(addPhotosStart)
                        else
                          p.proxy().collection.render(addPhotosEnd)
                      } else "",
                      s.editing.selected.map(selectedPage =>
                        if (selectedPage.index == page.index) toolbar(page)
                        else hover(page)
                    ).getOrElse("")
                  )
              }})
              ),

            if (!isCover) arrow("right", row+1) else "",

            < div(^.cls := "spread-btn clearfix " +
              (if (isCover) "col-xs-6 col-xs-offset-3" else "col-xs-10 col-xs-offset-1"),
              spread.zipWithIndex.map(buttons(row))
              )
            )
        }})
      }
    )
  }

  val component = ReactComponentB[Props]("Album")
    .initialState(State(Editing()))
    .renderBackend[Backend]
    .build

  def apply(props: Props) = component(props)
}
