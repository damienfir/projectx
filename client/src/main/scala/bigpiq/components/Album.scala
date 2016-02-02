package bigpiq.client.components

import bigpiq.client._
import bigpiq.shared._
import diode.data._
import diode.react._
import diode.react.ReactPot._
import scala.scalajs.js._
import org.scalajs.dom
import org.scalajs.jquery.jQuery
import org.scalajs.jquery.JQuery
import japgolly.scalajs.react.Callback
import japgolly.scalajs.react.vdom.prefix_<^._
import japgolly.scalajs.react._


case class Move(dx: Double, dy: Double, coordEvent: CoordEvent)

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
    val node = jQuery(ev.target)
    val pos = node.position().asInstanceOf[Dynamic]
    CoordEvent(
      x = pos.selectDynamic("left").asInstanceOf[Double] + node.width()/2.0,
      y = pos.selectDynamic("top").asInstanceOf[Double] + node.height()/2.0,
      w = parent.width(),
      h = parent.height(),
      page = page,
      idx = 0
    )
  }
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
}



object Album {
  case class Props(proxy: ModelProxy[Pot[Album]])//, mouseUp: PublishSubject[CoordEvent], mouseMove: PublishSubject[CoordEvent])
  case class State(pages: List[Page] = Nil, editing: Option[Either[Selected, Selected]] = None, edge: Option[EdgeParams] = None)
  case class Node(x: Double, y: Double)

  val imageDrag = new Drag()
  val edgeDrag = new Drag()

  class Backend($: BackendScope[Props, State]) {

    val dataToggle = "data-toggle".reactAttr
    val dataTarget = "data-target".reactAttr

    val blankPage = Page(0, -1, Nil)
    val coverPage = Page(0, 0, Nil)

    def cancelSelected = $.modState(s => s.copy(editing = None))

    def swapOrMoveTile(to: Selected): Callback = $.state.flatMap{s =>
      s.editing.map({
        case Left(selected) => $.setState(s.copy(editing = Some(Right(selected))))
        case Right(selected) => selected match {
          case Selected(to.page, to.index) => $.setState(s.copy(editing = None))
          case from@Selected(to.page, _) =>
            $.setState(s.copy(pages = AlbumUtil.swapTiles(s.pages, from, to), editing = None))// >> updateAlbum
          case from => to match {
            case Selected(0, _) =>
              $.props.flatMap(_.proxy.dispatch(AddToCover(from))) >>
              cancelSelected
            case _ =>
              $.props.flatMap(_.proxy.dispatch(MoveTile(from, to))) >>
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
            $.modState(s => s.copy(pages = AlbumUtil.move(s.pages, move)))
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
          s.copy(edge = Some(AlbumUtil.getParams(s.pages, coordEvent)))
        )
    }

    def rotateSelected = $.modState(s => s.editing match {
      case Some(Right(selected)) => s.copy(pages = AlbumUtil.rotate(s.pages, selected))
      case _ => s
    })

    def nodeMouseMove(page: Int)(ev: ReactMouseEvent) =
      edgeDrag.mouseMove(CoordEvent(page, 0, ev, jQuery(ev.target).parent(".box-mosaic"))) map { move =>
        $.modState(s => s.copy(pages =
          s.edge.map(edge => AlbumUtil.edge(s.pages, edge, move)).getOrElse(s.pages)))
      } getOrElse Callback(None)

    def nodeMouseUp = Callback(edgeDrag.mouseUp) >>
      $.modState(s =>
        s.copy(edge = None)
      ) >> updateAlbum

    def updateAlbum: Callback = {
      $.state flatMap (s => $.props flatMap (p => p.proxy.dispatch(UpdatePages(s.pages))))
    }

    def onChangeTitle(ev: ReactEventI) = $.props flatMap (p => p.proxy.dispatch(UpdateTitle(ev.target.value)))

    def toSpreads(pages: List[Page]): List[List[Page]] = {
      val pages2: List[Page] = pages match {
        case Nil => List(coverPage)
        case head :: tail => head +: blankPage +: tail :+ blankPage
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
        ^.height := pct(tile.ty2-tile.ty1),
        ^.width  := pct(tile.tx2-tile.tx1),
        ^.top    := pct(tile.ty1),
        ^.left  := pct(tile.tx1),
        ^.onMouseDown ==> imageMouseDown(page, index),
        ^.onMouseMove ==> imageMouseMove(page, index),
        ^.onMouseUp --> imageMouseUp(page, index),
        < img(^.src := "/photos/"+tile.photo.id+"/full/800,/"+tile.rot+"/default.jpg",
          ^.draggable := false,
          ^.height := pct(scaleY),
          ^.width  := pct(scaleX),
          ^.top    := pct(-tile.cy1 * scaleY),
          ^.left   := pct(-tile.cx1 * scaleX)
          )
        )
    }}

    def buttons(row: Int)(t: (Page, Int)) = t match { case (page, col) => {
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

    def title(collection: Album) =
      <.input(^.cls := "cover-title",  ^.id := "album-title",
        ^.onBlur ==> onChangeTitle,
        ^.`type` := "text",
        ^.placeholder := "Album title",
        ^.maxLength := 50,
        ^.defaultValue := collection.title,
        ^.autoComplete := false
      )


    def drawNode(page: Int)(node: Node) =
      <.button(
        ^.cls := "node shadow",
        ^.top := pct(node.y),
        ^.left := pct(node.x),
        ^.onMouseDown ==> nodeMouseDown(page),
        ^.onMouseMove ==> nodeMouseMove(page),
        ^.onMouseUp --> nodeMouseUp
      )

    def dist(n1: Node, n2: Node) = Math.sqrt(Math.pow(n1.x-n2.x, 2) + Math.pow(n1.y-n2.y,2))

    def nodes(page: Page) = {
      val all = (for {
        tl <- page.tiles.map(t => Node(t.tx1, t.ty1)).filter(n => n.x > 0.01 || n.y > 0.01)
        br <- page.tiles.map(t => Node(t.tx2, t.ty2)).filter(n => n.x < 0.99 || n.y < 0.99)
      } yield {
        val x2 = (tl.x + br.x) / 2.0
        val y2 = (tl.y + br.y) / 2.0
        List(Node(x2, tl.y), Node(x2, br.y), Node(tl.x, y2), Node(br.x, y2))
          .filter(n => dist(n, tl) < 0.02 || dist(n, br) < 0.02)
      }).flatten
      all.zipWithIndex.filter({ case (n,i) => !all.slice(i+1, all.length).filter(_ != n).map(dist(n, _)).exists(_ < 0.01)}).map(_._1)
        .map(drawNode(page.index))
    }

    def addPhotosStart() =
      <.button(^.cls := "btn btn-info btn-lg btn-step center shadow",
        ^.id := "create-btn",
        dataToggle := "modal",
        dataTarget := "#upload-modal",
        UI.icon("cloud-upload"), "Upload photos"
      )

    def addPhotosEnd(col: Album) =
      <.button(^.cls := "btn btn-primary center", ^.id := "addmore-btn",
        dataToggle := "modal",
        dataTarget := "#upload-modal",
        UI.icon("cloud-upload"), "Upload more photos"
      )

    def toolbar(page: Page, selected: Selected) =
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

    def hover(page: Page) =
      <.div(^.cls := "page-hover",
        ^.onMouseUp --> imageMouseUp(page.index, 0),
        <.h2(^.cls := "center", if (page.index == 0) "Copy here" else "Move here")
      )

    def render(p: Props, s: State) = <.div(^.cls:="container-fluid album",
        toSpreads(s.pages).zipWithIndex.map({ case (spread, row) => {
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
                    if (page.index == 0) p.proxy().render(col => title(col)) else "",
                    nodes(page),
                    if (page.tiles.isEmpty) {
                      if (page.index == 0)
                        p.proxy().renderEmpty(addPhotosStart)
                      else
                        p.proxy().render(addPhotosEnd)
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
    )

    def willMount(props: Props) = {
      // imageDrag.setProps($.props, updateAlbum, moveAlbum)
      // edgeDrag.setProps($.props, freeParams, moveEdge)
      props.proxy().map { col =>
        dom.history.pushState("", "", s"/ui/${col.hash}")
      }
      $.setState(State(props.proxy().map(_.pages).getOrElse(Nil), None, None))
    }
  }

  def apply(props: Props) = ReactComponentB[Props]("Album")
    .initialState(State())
    .renderBackend[Backend]
    .componentWillMount(scope => scope.backend.willMount(scope.props))
    .build
    .apply(props)
}
