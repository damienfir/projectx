package bigpiq.client.components

import scala.scalajs.js._
import org.scalajs.jquery.{JQuery, jQuery}
import japgolly.scalajs.react._
import japgolly.scalajs.react.vdom.prefix_<^._


object UI {
  def icon(style: String) = <.i(^.cls := "fa fa-"+style)

  case class Move(dx: Double, dy: Double, down: MouseDown)

  case class MouseMove(x: Double, y: Double)
  object MouseMove {
    def apply(ev: ReactMouseEvent): MouseMove = {
      ev.preventDefault()
      ev.stopPropagation()
      MouseMove(ev.screenX, ev.screenY)
    }
  }

  case class MouseDown(x: Double, y: Double, w: Double, h: Double, idx: Int, page: Int)
  object MouseDown {
    def apply(page: Int, idx: Int, ev: ReactMouseEvent, target: JQuery): MouseDown = {
      ev.preventDefault()
      ev.stopPropagation()
      MouseDown(
        x = ev.screenX,
        y = ev.screenY,
        w = target.width(),
        h = target.height(),
        idx = idx,
        page = page
      )

    }

    def apply(page: Int, idx: Int, ev: ReactMouseEvent): MouseDown = {
      ev.preventDefault()
      ev.stopPropagation()
      MouseDown(0,0,0,0, idx, page)
    }

    def edgeClick(page: Int, ev: ReactMouseEvent): MouseDown = {
      ev.preventDefault()
      ev.stopPropagation()
      val parent = jQuery(ev.target).parent(".box-mosaic")
      val node = jQuery(ev.target)
      val pos = node.position().asInstanceOf[Dynamic]
      MouseDown(
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
    var down : Option[MouseDown] = None
    var prevMove : Option[MouseMove] = None

    def mouseDown(ev: MouseDown) = {
      down = Some(ev)
      ev
    }

    def mouseUp: Option[MouseMove] = {
      down = None
      val r = prevMove
      if (prevMove.isDefined) prevMove = None
      r
    }

    def mouseMove(curr: MouseMove): Option[Move] = down match {
      case Some(d) => prevMove match {
        case Some(prev) => {
          prevMove = Some(curr)
          Some(Move(
            dx = (curr.x - prev.x) / d.w,
            dy = (curr.y - prev.y) / d.h,
            d
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
}


object Bootstrap {
  @scalajs.js.native
  trait BootstrapJQuery extends JQuery {
    def modal(action: String): BootstrapJQuery = scalajs.js.native
    def modal(options: scalajs.js.Any): BootstrapJQuery = scalajs.js.native
  }

  implicit def jq2bootstrap(jq: JQuery): BootstrapJQuery = jq.asInstanceOf[BootstrapJQuery]
}
