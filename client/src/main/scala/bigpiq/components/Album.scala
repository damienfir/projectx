package bigpiq.client.components

import bigpiq.client._
import bigpiq.shared._
import diode.data._
import diode.react._
import diode.react.ReactPot._
import scala.scalajs.js._
import org.scalajs.dom
import org.scalajs.dom.raw.MouseEvent
import org.scalajs.jquery.{JQueryEventObject, jQuery}
import japgolly.scalajs.react.Callback
import japgolly.scalajs.react.vdom.prefix_<^._
import japgolly.scalajs.react._
import org.scalajs.dom.document

case class Selected(page: Int, index: Int)

case class EdgeParams(x_tl: List[Int], y_tl: List[Int], x_br: List[Int], y_br: List[Int])

object Album {

  case class BlankPage() extends PageElement

  case class BacksidePage() extends PageElement

  case class CoverPage() extends PageElement

  case class Props(proxy: ModelProxy[Pot[AlbumPot]])

  case class State(
                    pages: List[Pot[Page]] = Nil,
                    editing: Option[Either[Selected, Selected]] = None,
                    edge: Option[EdgeParams] = None) {

    def allPages: List[Page] = pages.flatten

    def update(f: List[Page] => List[Page]) = this.copy(pages = f(allPages).map(Ready(_)))
  }

  case class Node(x: Double, y: Double)

  class Backend($: BackendScope[Props, State]) {

    val imageDrag = new UI.Drag()
    val edgeDrag = new UI.Drag()

    val blankPage = BlankPage()
    val backsidePage = BacksidePage()
    val coverPage = CoverPage()

    def cancelSelected = $.modState(s => s.copy(editing = None))

    def swapOrMoveTile(to: Selected): Callback = $.state.flatMap { s =>
      s.editing.map({
        case Left(selected) => $.setState(s.copy(editing = Some(Right(selected))))
        case Right(selected) => (selected match {
          case Selected(to.page, to.index) => Callback(None)
          case from@Selected(to.page, _) => {
            val newPages = AlbumUtil.swapTiles(s.allPages, from, to)
            updateAlbum(newPages)
          }
          case from => to match {
            case Selected(0, _) => $.props.flatMap(_.proxy.dispatch(AddToCover(from)))
            case _ => $.props.flatMap(_.proxy.dispatch(MoveTile(from, to)))
          }
        }) >> cancelSelected
      }) getOrElse Callback(None)
    }

    def imageMouseDown(page: Int, index: Int)(ev: ReactMouseEvent) =
      Callback(imageDrag.mouseDown(UI.MouseDown(page, index, ev, jQuery(ev.target)))) >>
        $.modState(s => s.copy(editing = Some(s.editing.getOrElse(Left(Selected(page, index))))))

    def imageMouseMove(ev: ReactMouseEvent) =
      $.state.flatMap(s => s.editing match {
        case Some(Right(editing)) => Callback(None)
        case selected =>
          imageDrag.mouseMove(UI.MouseMove(ev)).map(move =>
            $.modState(s => s.update(AlbumUtil.move(_, move)))
          ).getOrElse(nodeMouseMove(ev)) >>
            selected.map(_ => cancelSelected).getOrElse(Callback(None))
      })

    def imageMouseUp(ev: Option[UI.MouseDown]) =
      (imageDrag.mouseUp orElse edgeDrag.mouseUp)
        .map(_ => updateAlbum())
        .getOrElse(Callback(None)) >>
        ev.map(e => swapOrMoveTile(Selected(e.page, e.idx)))
          .getOrElse(Callback(None))

    def nodeMouseDown(page: Int)(ev: ReactMouseEvent) = {
      val coordEvent = UI.MouseDown.edgeClick(page, ev)
      Callback(edgeDrag.mouseDown(coordEvent)) >>
        $.modState(s =>
          s.copy(edge = Some(AlbumUtil.getParams(s.allPages, coordEvent)))
        )
    }

    def rotateSelected = $.modState(s => s.editing match {
      case Some(Right(selected)) => s.update(pages => AlbumUtil.rotate(pages, selected))
      case _ => s
    })

    def nodeMouseMove(ev: ReactMouseEvent) =
      edgeDrag.mouseMove(UI.MouseMove(ev)) map { move =>
        $.modState(s => s.update(pages =>
          s.edge.map(edge => AlbumUtil.edge(pages, edge, move)).getOrElse(pages)))
      } getOrElse Callback(None)

    def nodeMouseUp(ev: ReactMouseEvent) = Callback(edgeDrag.mouseUp) >>
      $.modState(s => s.copy(edge = None)) >> updateAlbum()

    def updateAlbum(): Callback =
      $.state flatMap (s =>
        $.props flatMap (p =>
          p.proxy.dispatch(UpdatePages(s.pages)) >>
            p.proxy.dispatch(SaveAlbum)))

    def updateAlbum(newPages: List[Page]): Callback =
      $.modState(s => s.update(_ => newPages)) >>
        $.props.flatMap(p =>
          p.proxy.dispatch(UpdatePages(newPages.map(Ready(_)))) >>
            p.proxy.dispatch(SaveAlbum))

    def onChangeTitle(ev: ReactEventI) = $.props flatMap (p => p.proxy.dispatch(UpdateTitle(ev.target.value)))

    def toSpreads(pages: List[Pot[Page]]): List[List[Pot[PageElement]]] = {
      val pages2 = pages match {
        case Nil => List(Ready(coverPage))
        case head :: tail => head +: Ready(backsidePage) +: tail :+ Ready(blankPage)
      }
      List(pages2.head) +: pages2.tail.grouped(2).toList
    }

    def pct(x: Double): String = (x * 100.0) + "%"

    def backside() = <.div(^.cls := "backside", "bigpiq")

    def tile(page: Int, selected: Option[Either[Selected, Selected]])(t: (Tile, Int)) = t match {
      case (tile, index) => {
        val scaleX = 1.0 / (tile.cx2 - tile.cx1)
        val scaleY = 1.0 / (tile.cy2 - tile.cy1)
        val selClass = selected.map({
          case Right(Selected(`page`, `index`)) => "tile-selected"
          case Right(Selected(_, _)) => "tile-unselected"
          case Left(_) => ""
        }) getOrElse ""

        < div(
          ^.cls := "ui-tile " + selClass,
          ^.height := pct(tile.ty2 - tile.ty1),
          ^.width := pct(tile.tx2 - tile.tx1),
          ^.top := pct(tile.ty1),
          ^.left := pct(tile.tx1),
          ^.onMouseDown ==> imageMouseDown(page, index),
          ^.onMouseMove ==> imageMouseMove,
          ^.onMouseUp ==> ((ev: ReactMouseEvent) => imageMouseUp(Some(UI.MouseDown(page, index, ev)))),
          <.div(^.cls := "pending-tile full", UI.icon("camera fa-2x center")),
          < img(
            ^.src := "/photos/" + tile.photo.id + "/full/600,/" + tile.rot + "/default.jpg",
            ^.draggable := false,
            ^.height := pct(scaleY),
            ^.width := pct(scaleX),
            ^.top := pct(-tile.cy1 * scaleY),
            ^.left := pct(-tile.cx1 * scaleX)
            )
          )
      }
    }

    def buttons(row: Int)(t: (Pot[PageElement], Int)) = t match {
      case (pagePot: Pot[PageElement], col) =>
        val p = row * 2 + col
        val pull = if ((p % 2) == 0) "pull-left" else "pull-right"
        pagePot map {
          case page: Page =>

            val btnShuffle = <.button(^.cls := "btn btn-primary shuffle-btn",
              ^.onClick --> $.props.flatMap(_.proxy.dispatch(ShufflePage(page.index))),
              ^.disabled := pagePot.isPending,
              UI.icon("refresh"),
              " Shuffle")

            //        val btnAdd = <.button(
            //          "Add photos after",
            //          ^.cls := "btn btn-primary",
            //          ^.onClick --> ($.props.flatMap(p => p.proxy.dispatch(RequestUploadAfter(page.index))) >> Callback(Upload.show)))

            val btnLeft = <.button(
              UI.icon("chevron-left"), "Backwards",
              ^.cls := "btn btn-primary",
              ^.disabled := pagePot.isPending,
              ^.onClick --> $.props.flatMap(_.proxy.dispatch(MovePageLeft(page))))

            val btnRight = <.button(
              "Forwards ", UI.icon("chevron-right"),
              ^.cls := "btn btn-primary",
              ^.disabled := pagePot.isPending,
              ^.onClick --> $.props.flatMap(_.proxy.dispatch(MovePageRight(page))))

            val btnGroup = <.div(^.cls := "btn-group", btnLeft, btnRight)

            <.div(^.cls := pull,
              <.span(^.cls := "page", if (p == 0) "Cover Page" else s"Page ${p - 1}"),
              page.tiles.length > 1 ?= btnShuffle,
              btnGroup
            )

          case _ => <.div(^.cls := pull, <.span(^.cls := "page", "Blank page"))

        } getOrElse EmptyTag
    }

    def arrow(direction: String, row: Int) =
      <.div(
        ^.cls := "col-xs-1 spread-arrow",
        <.a(
          ^.cls := "btn btn-link",
          ^.href := "#spread" + row,
          UI.icon(s"chevron-$direction fa-3x")
        )
      )

    def title(t: String) =
      <.input(^.cls := "cover-title", ^.id := "album-title",
        ^.onBlur ==> onChangeTitle,
        ^.`type` := "text",
        ^.placeholder := "Album title",
        ^.maxLength := 50,
        ^.defaultValue := t,
        ^.autoComplete := false
      )


    def drawNode(page: Int)(node: Node) =
      <.button(
        ^.cls := "node shadow",
        ^.top := pct(node.y),
        ^.left := pct(node.x),
        ^.onMouseDown ==> nodeMouseDown(page),
        ^.onMouseMove ==> nodeMouseMove,
        ^.onMouseUp ==> nodeMouseUp
      )

    def dist(n1: Node, n2: Node) = Math.sqrt(Math.pow(n1.x - n2.x, 2) + Math.pow(n1.y - n2.y, 2))

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
      all.zipWithIndex.filter({ case (n, i) => !all.slice(i + 1, all.length).filter(_ != n).map(dist(n, _)).exists(_ < 0.01) }).map(_._1)
        .map(drawNode(page.index))
    }

    def photoAddStart =
      <.button(^.cls := "btn btn-info btn-lg btn-step center shadow",
        ^.id := "create-btn",
        UI.icon("cloud-upload fa-3x"), "Upload photos",
        ^.onClick --> Callback(Upload.show)
      )

    def photosAddEnd =
      <.button(^.cls := "btn btn-primary center", ^.id := "addmore-btn",
        UI.icon("cloud-upload"), "Upload more photos",
        ^.onClick --> Callback(Upload.show)
      )

    def toolbar(page: Page, selected: Selected) = {

      def removeBtn =
        <.button(^.cls := "btn btn-info btn-lg", ^.id := "remove-btn",
          ^.onClick --> ($.props.flatMap(_.proxy.dispatch(RemoveTile(selected))) >> cancelSelected),
          UI.icon("trash-o"))

      def newPageBtn =
        <.button(^.cls := "btn btn-info btn-lg",
          ^.onClick --> ($.props.flatMap(_.proxy.dispatch(AddToNextPage(selected))) >> cancelSelected),
          UI.icon("plus"))

      def rotateBtn =
        <.button(^.cls := "btn btn-info btn-lg", ^.id := "rotate-btn",
          ^.onClick --> rotateSelected,
          UI.icon("rotate-right"))

      def addToCoverBtn =
        <.button(^.cls := "btn btn-info btn-lg", ^.id := "add-cover-btn",
          ^.onClick --> ($.props.flatMap(_.proxy.dispatch(AddToCover(selected))) >> cancelSelected),
          UI.icon("book"))

      def cancelBtn =
        <.button(^.cls := "btn btn-info btn-lg", ^.id := "cancel-btn",
          ^.onClick --> cancelSelected,
          UI.icon("times"))

      <.div(^.cls := "btn-group toolbar",
        removeBtn,
        page.tiles.length > 1 ?= newPageBtn,
        rotateBtn,
        page.index != 0 ?= addToCoverBtn,
        cancelBtn
      )
    }

    def hover(page: Page) =
      <.div(^.cls := "page-hover",
        ^.onMouseUp ==> ((ev: ReactMouseEvent) => imageMouseUp(Some(UI.MouseDown(page.index, -1, ev)))),
        <.h2(^.cls := "center", if (page.index == 0) "Copy here" else "Move here")
      )

    def pending =
      <.div("page-hover",
        UI.icon("camera fa-3x center pending"))


    def singlePage(s: State, row: Int, t: String)(p: (Pot[PageElement], Int)) = {

      def cls(row: Int, col: Int) =
        "box-mosaic " + (if ((row * 2 + col) % 2 == 0) "pull-left" else "pull-right")

      p match {

        case (_: Pending | Empty, col) =>
          <.div(^.cls := cls(row, col), pending)

        case (page: Pot[PageElement], col) => page.map {
          case _: BacksidePage =>
            <.div(^.cls := cls(row, col), backside())

          case _: BlankPage =>
            <.div(^.cls := cls(row, col), photosAddEnd)

          case p: Page =>
            <.div(^.cls := cls(row, col),
              p.tiles.zipWithIndex.map(tile(p.index, s.editing)),
              (p.index == 0) ?= title(t),
              nodes(p),
              s.editing.map({
                case Left(_) => EmptyTag
                case Right(e) =>
                  if (e.page == p.index) toolbar(p, e)
                  else hover(p)
              }))

        } getOrElse EmptyTag

        case _ => EmptyTag
      }
    }

    def render(p: Props, s: State) = s.pages match {

      case Nil => photoAddStart

      case pages =>
        <.div(^.cls := "container-fluid album",

          toSpreads(pages).zipWithIndex.map({ case (spread, row) =>

            val title = p.proxy().map(_.title).getOrElse("")
            val isCover = row == 0

            <.div(
              ^.classSet1("row spread", "spread-cover" -> isCover),

              <.a(
                ^.cls := "spread-anchor",
                ^.name := "spread" + row),

              !isCover ?= arrow("left", row - 1),

              <.div(
                ^.classSet1("spread-paper shadow clearfix",
                  "col-xs-6 col-xs-offset-3" -> isCover,
                  "col-xs-10" -> !isCover),
                spread.zipWithIndex.map(singlePage(s, row, title))),

              !isCover ?= arrow("right", row + 1),

              <.div(
                ^.classSet1("spread-btn clearfix",
                  "col-xs-6 col-xs-offset-3" -> isCover,
                  "col-xs-10 col-xs-offset-1" -> !isCover),
                spread.zipWithIndex.map(buttons(row))
              )

            )
          })
        )
    }

    def willMount(props: Props, backend: Backend) = {
      dom.document.onmousemove = (ev: MouseEvent) =>
        backend.imageMouseMove(ev.asInstanceOf[ReactMouseEvent]).runNow()

      dom.document.body.onmouseup = (ev: MouseEvent) =>
        backend.imageMouseUp(None).runNow()

      $.setState(State(props.proxy().map(_.pages).getOrElse(Nil), None, None))
    }
  }

  def apply(props: Props) = ReactComponentB[Props]("Album")
    .initialState(State())
    .renderBackend[Backend]
    .componentWillMount(scope => scope.backend.willMount(scope.props, scope.backend))
    .build
    .apply(props)
}
