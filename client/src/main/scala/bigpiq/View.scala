package bigpiq.client.views

import bigpiq.client._
import bigpiq.shared._
import diode.data.{Empty, Ready, Pot}
import diode.react.ModelProxy
import diode.react.ReactPot._
import japgolly.scalajs.react._
import japgolly.scalajs.react.vdom.prefix_<^._
import monifu.reactive.subjects.PublishSubject
import monifu.concurrent.Implicits.globalScheduler
import org.scalajs.dom
import org.scalajs.dom.raw._
import org.scalajs.jquery._

import scala.collection.immutable.Range
import scala.scalajs.js
import scala.scalajs.js.Dynamic
import scala.scalajs.js.Dynamic.{global => g}

import Bootstrap._


object UI {
  def icon(style: String) = <.i(^.cls := "fa fa-"+style)
}


case class EdgeParams(x_tl: List[Int], y_tl: List[Int], x_br: List[Int], y_br: List[Int])
case class Selected(page: Int, index: Int)

case class CoordEvent(x: Double, y: Double, w: Double, h: Double, idx: Int, page: Int)
object CoordEvent {
  def apply(page: Int, idx: Int, ev: ReactMouseEvent, target: JQuery): CoordEvent = {
    ev.preventDefault()
    ev.stopPropagation()
    CoordEvent(
      x = ev.screenX,
      y = ev.screenY,
      w = target.width(),
      h = target.height(),
      idx = idx,
      page = page
    )
  }

  def edgeClick(page: Int, ev: ReactMouseEvent): CoordEvent = {
    ev.preventDefault()
    ev.stopPropagation()
    val parent = jQuery(ev.target).parent(".box-mosaic")
    val pos = jQuery(ev.target).position().asInstanceOf[Dynamic]
    val w = parent.width()
    val h = parent.height()
    CoordEvent(
      x = pos.selectDynamic("left").asInstanceOf[Double] / w,
      y = pos.selectDynamic("top").asInstanceOf[Double] / h,
      w = w,
      h = h,
      page = page,
      idx = 0
    )
  }
}

// case class EdgeClick(x: Double, y: Double, w: Double, h: Double, page: Int)
// object EdgeClick {
//   def apply(page: Int, ev: ReactMouseEvent): EdgeClick = {
//     ev.preventDefault()
//     ev.stopPropagation()
//     val parent = jQuery(ev.target).parent(".box-mosaic")
//     val pos = jQuery(ev.target).position().asInstanceOf[Dynamic]
//     val w = parent.width()
//     val h = parent.height()
//     EdgeClick(
//       x = pos.selectDynamic("left")().asInstanceOf[Double] / w,
//       y = pos.selectDynamic("top").asInstanceOf[Double] / h,
//       w = w,
//       h = h,
//       page = page
//     )
//   }
// }

case class Move(dx: Double, dy: Double, coordEvent: CoordEvent)

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


object Nav {
  class Backend($: BackendScope[ModelProxy[RootModel], Unit]) {
    val dataToggle = "data-toggle".reactAttr
    val dataTarget = "data-target".reactAttr

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
                  ^.onClick --> onSave,
                  UI.icon("heart-o"), " Save"
                )
              ),
              <.li(
                <.button(^.cls := "btn btn-primary navbar-btn",
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
    .build.apply(proxy)
}



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


class Drag {

  var down : Option[CoordEvent] = None
  var prevMove : Option[CoordEvent] = None

  def mouseDown(ev: CoordEvent) = {
    down = Some(ev)
    ev
  }

  def mouseUp: Option[CoordEvent] = {
    down = None
    val prevMoveSave = prevMove
    prevMoveSave map { p =>
      prevMove = None
      p
    }
  }

  def mouseMove(curr: CoordEvent): Option[Move] = down match {
    case Some(down) => prevMove match {
      case Some(prev) => {
        prevMove = Some(curr)
        Some(Move(
          dx = (curr.x - prev.x) / down.w,
          dy = (curr.y - prev.y) / down.h,
          coordEvent = down
        ))
      }
      case None => {
        prevMove = Some(curr)
        None
      }
    }
    case None => None
  }

  // def setProps(props: CallbackTo[Album.Props], up: => Callback, move: Option[Move] => Callback) =  {
  //   props.map(_.mouseUp.foreach(ev => (Callback(mouseUp)) >> up).runNow())).runNow()
  //   props.map(_.mouseMove.foreach(ev => move(mouseMove(ev)).runNow())).runNow()
  // }
}



object Album {
  case class Props(proxy: ModelProxy[RootModel])//, mouseUp: PublishSubject[CoordEvent], mouseMove: PublishSubject[CoordEvent])
  case class State(album: Pot[List[Composition]] = Empty, editing: Option[Either[Selected, Selected]] = None, edge: Option[EdgeParams] = None)
  case class Node(x: Float, y: Float)

  val imageDrag = new Drag()
  val edgeDrag = new Drag()

  class Backend($: BackendScope[Props, State]) {

    val dataToggle = "data-toggle".reactAttr
    val dataTarget = "data-target".reactAttr

    val blankpage = Composition(0, 0, -2, List())
    val coverpage = Composition(0, 0, 0, List())

    def cancelSelected = $.modState(s => s.copy(editing = None))

    def swapOrMoveTile(to: Selected): Callback = $.state.flatMap{s =>
      s.editing.map({
        case Left(selected) => $.setState(s.copy(editing = Some(Right(selected))))
        case Right(selected) => selected match {
          case Selected(to.page, to.index) => $.setState(s.copy(editing = None))
          case from@Selected(to.page, _) => $.setState(s.copy(album = Ready(AlbumUtil.swapTiles(s.album.get, from, to)), editing = None))// >> updateAlbum
          case from => to match {
            case Selected(0, _) => $.props.flatMap(_.proxy.dispatch(AddToCover(from))) >>
              cancelSelected
            case _ => $.props.flatMap(_.proxy.dispatch(MoveTile(from, to))) >>
              cancelSelected
          }
        }
      }) getOrElse Callback(None)
    }

    def imageMouseDown(page: Int, index: Int)(ev: ReactMouseEvent) = 
      Callback(imageDrag.mouseDown(CoordEvent(page, index, ev, jQuery(ev.target)))) >>
      $.modState(s => s.copy(editing = Some(s.editing.getOrElse(Left(Selected(page, index))))))

    def imageMouseMove(page: Int, index: Int)(ev: ReactMouseEvent) =
      $.state.flatMap(s => s.editing match {
        case Some(Right(editing)) => Callback(None)
        case selected =>
          imageDrag.mouseMove(CoordEvent(page, index, ev, jQuery(ev.target))).map(move =>
            $.modState(s => s.copy(album = Ready(AlbumUtil.move(s.album.get, move))))
          ).getOrElse(Callback(None)) >>
          nodeMouseMove(page)(ev) >>
          selected.map(_ => $.modState (s => s.copy(editing = None))).getOrElse(Callback(None))
      })

    def imageMouseUp(page: Int, index: Int) = 
      (imageDrag.mouseUp orElse edgeDrag.mouseUp).map(_ => updateAlbum).getOrElse(Callback(None)) >>
      swapOrMoveTile(Selected(page, index))

    def nodeMouseDown(page: Int)(ev: ReactMouseEvent) = {
      val coordEvent = CoordEvent.edgeClick(page, ev)
      Callback(edgeDrag.mouseDown(coordEvent)) >>
      $.modState(s =>
        s.copy(edge = Some(AlbumUtil.getParams(s.album.get, coordEvent)))
      )
    }

    def rotateSelected = $.modState(s => s.editing match {
      case Some(Right(selected)) => s.copy(album = Ready(AlbumUtil.rotate(s.album.get, selected)))
      case _ => s
    })

    def nodeMouseMove(page: Int)(ev: ReactMouseEvent) =
      edgeDrag.mouseMove(CoordEvent(page, 0, ev, jQuery(ev.target).parent(".box-mosaic"))) map { move =>
        $.modState(s => s.copy(album =
          s.edge.map(edge => Ready(AlbumUtil.edge(s.album.get, edge, move))).getOrElse(s.album)))
      } getOrElse Callback(None)

    def nodeMouseUp = Callback(edgeDrag.mouseUp) >>
      $.modState(s =>
        s.copy(edge = None)
      ) >> updateAlbum

    def updateAlbum: Callback = {
      $.state flatMap (s => $.props flatMap (p => p.proxy.dispatch(SetAlbum(s.album))))
    }

    def onChangeTitle(ev: ReactEventI) = Callback(None)

    def toSpreads(pages: List[Composition]): List[List[Composition]] = {
      val pages2: List[Composition] = pages match {
        case Nil => List(coverpage)
        case head :: tail => head +: blankpage +: tail :+ blankpage
      }
      List(pages2.head) +: pages2.tail.grouped(2).toList
    }

    def pct(x: Double): String = (x*100.0) + "%"

    def backside() = <.div(^.cls := "backside", "bigpiq")

    def tile(page: Int, selected: Option[Either[Selected, Selected]])(t: (Tile, Int)) = t match { case (tile, index) => {
      val scaleX = 1.0 / (tile.cx2 - tile.cx1)
      val scaleY = 1.0 / (tile.cy2 - tile.cy1)
      val selClass = selected.map({
        case Right(Selected(`page`, `index`)) => "tile-selected"
        case Right(Selected(_,_)) => "tile-unselected"
        case Left(_) => ""
      }) getOrElse ""
      < div(^.cls := "ui-tile " + selClass,
//        ^.key := tile.photoID,
        ^.height := pct(tile.ty2-tile.ty1),
        ^.width  := pct(tile.tx2-tile.tx1),
        ^.top    := pct(tile.ty1),
        ^.left  := pct(tile.tx1),
        ^.onMouseDown ==> imageMouseDown(page, index),
        ^.onMouseMove ==> imageMouseMove(page, index),
        ^.onMouseUp --> imageMouseUp(page, index),
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
        <.span(^.cls := "page", if (p == 0) "Cover Page" else s"Page ${p-1}"),
        if (page.tiles.length > 1)
          <.div(^.cls := "btn-group",
            <.button(^.cls := "btn btn-primary shuffle-btn",
              ^.onClick --> $.props.flatMap(_.proxy.dispatch(ShufflePage(page.index))),
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
        ^.onChange ==> onChangeTitle,
        ^.`type` := "text",
        ^.placeholder := "Album title",
        ^.maxLength := 50,
        ^.value := collection.name,
        ^.autoComplete := false
      )


    def drawNode(shift: Float, page: Int)(node: Node) =
      <.button(
        ^.cls := "node shadow",
        ^.top := pct(node.y + shift),
        ^.left := pct(node.x + shift),
        ^.onMouseDown ==> nodeMouseDown(page),
        ^.onMouseMove ==> nodeMouseMove(page),
        ^.onMouseUp --> nodeMouseUp
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
      bottomRight.map(drawNode(shift, page.index)) ++ topLeft.map(drawNode(-shift, page.index))
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

    def toolbar(page: Composition, selected: Selected) =
      <.div(^.cls := "btn-group toolbar",
        if (page.tiles.length > 1)
          <.button(^.cls := "btn btn-info btn-lg", ^.id := "remove-btn",
            ^.onClick --> ($.props.flatMap(_.proxy.dispatch(RemoveTile(selected))) >> cancelSelected),
            UI.icon("trash-o")
          )
        else "",
        <.button(^.cls := "btn btn-info btn-lg", ^.id := "rotate-btn",
          ^.onClick --> rotateSelected,
          UI.icon("rotate-right")
        ),
        if (page.index != 0)
          <.button(^.cls := "btn btn-info btn-lg", ^.id := "add-cover-btn",
            ^.onClick --> ($.props.flatMap(_.proxy.dispatch(AddToCover(selected))) >> cancelSelected),
            UI.icon("book")
          )
        else "",
        <.button(^.cls := "btn btn-info btn-lg", ^.id := "cancel-btn",
          ^.onClick --> cancelSelected,
          UI.icon("times")
        )
      )

    def hover(page: Composition) =
      <.div(^.cls := "page-hover",
        ^.onMouseUp --> imageMouseUp(page.index, 0),
        <.h2(^.cls := "center", if (page.index == 0) "Copy here" else "Move here")
      )

    def render(p: Props, s: State) = <.div(^.cls:="container-fluid album",
      s.album.render { pages =>
        toSpreads(pages).zipWithIndex.map({ case (spread, row) => {
          val isCover = spread.length == 1 && spread.head.index == 0
          < div(^.cls := "row spread "+(if (isCover) "spread-cover" else ""), ^.key := row,

            < a(^.cls := "spread-anchor",
              ^.name := "spread" + row
              ),

            if (!isCover) arrow("left", row-1) else "",

            < div(^.cls := "spread-paper shadow clearfix " +
              (if (isCover) "col-xs-6 col-xs-offset-3" else "col-xs-10"),
              spread.zipWithIndex.map({case (page, col) => {
                val cls = "box-mosaic " + (if ((row*2+col) % 2 == 0) "pull-left" else "pull-right")
                  if (col == 0 && row == 1)
                    < div(^.cls := cls, ^.key := page.index, backside())
                  else
                    < div(^.cls := cls, ^.key := page.index,
                      page.tiles.zipWithIndex.map(tile(page.index, s.editing)),
                      if (page.index == 0) p.proxy().collection.render(col => title(col)) else "",
                      nodes(page),
                      if (page.tiles.isEmpty) {
                        if (page.index == 0)
                          p.proxy().collection.renderEmpty(addPhotosStart)
                        else
                          p.proxy().collection.render(addPhotosEnd)
                      } else "",
                      s.editing.map({
                        case Left(_) => <.div()
                        case Right(e) =>
                          if (e.page == page.index) toolbar(page, e)
                          else hover(page)
                      }).getOrElse("")
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

    def willMount(props: Props) = {
      // imageDrag.setProps($.props, updateAlbum, moveAlbum)
      // edgeDrag.setProps($.props, freeParams, moveEdge)
      $.setState(State(props.proxy().album, None, None))
    }
  }

  def apply(props: Props) = ReactComponentB[Props]("Album")
    .initialState(State())
    .renderBackend[Backend]
    .componentWillMount(scope => scope.backend.willMount(scope.props))
    .build
    .apply(props)
}
