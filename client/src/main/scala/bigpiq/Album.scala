package bigpiq.client

import bigpiq.client.views.{CoordEvent, EdgeParams, Move}
import bigpiq.shared.{Composition, Tile}

import scala.scalajs.js.Dynamic.{global => g}
import scala.util.Try

object AlbumUtil {
  def moveCoord(c: (Float, Float), offset: Double): (Float, Float) = {
//    g.console.log(offset.asInstanceOf[Float])
    val new1 = Math.max(0, c._1 - offset.asInstanceOf[Float])
//    g.console.log(new1)
    val new2 = new1 + (c._2 - c._1)
//    g.console.log(new2)
    if (new2 > 1) c else (new1, new2)
  }

  def moveTile(tile: Tile, m: Move) : Tile = {
    val (cx1, cx2) = moveCoord((tile.cx1, tile.cx2), m.dx)
    val (cy1, cy2) = moveCoord((tile.cy1, tile.cy2), m.dy)
    val newT = tile.copy(cx1=cx1, cx2=cx2, cy1=cy1, cy2=cy2)
    newT
  }

  def move(album: List[Composition], move: Move) = album.map {
    case comp@Composition(_, _, move.coordEvent.page, tiles) =>
      Try(tiles(move.coordEvent.idx))
        .map(moveTile(_, move))
        .map(tiles.updated(move.coordEvent.idx, _))
        .map(tiles => comp.copy(tiles = tiles))
        .getOrElse(comp)
    case x => x
  }

  val arPaper = Math.sqrt(2).asInstanceOf[Float]

  def resizeTile(t: (Tile, Tile)): Tile = t match { case (a, b) =>
    val arTile = arPaper * ((a.tx2-a.tx1) / (a.ty2-a.ty1))
    val arImg = arTile / ((a.cx2-a.cx1) / (a.cy2-a.cy1))
    val arTile2 = arPaper * (b.tx2-b.tx1) / (b.ty2-b.ty1)

    val center = ((a.cx2-a.cx1)/2.0, (a.cy2-a.cy1)/2.0)

    val c = if (arImg < arTile2) b.copy(cx2 = 1, cy2 = arImg/arTile2, cx1 = 0, cy1 = 0)
      else b.copy(cx2 = arTile2/arImg, cy2 = 1, cx1 = 0, cy1 = 0)

    val dx = Math.min(1-c.cx2, Math.max(0, center._1-c.cx2/2.0)).asInstanceOf[Float]
    val dy = Math.min(1-c.cy2, Math.max(0, center._2-c.cy2/2.0)).asInstanceOf[Float]
    c.copy(cx1 = c.cx1+dx, cx2 = c.cx2+dx, cy1 = c.cy1+dy, cy2 = c.cy2+dy)
  }

  val d = 0.1;

  def edge(album: List[Composition], params: EdgeParams, move: Move): List[Composition] = album map {
    case comp@Composition(_, _, move.coordEvent.page, oldTiles) => {
      def moveEdge(indices: List[Int], canMove: Boolean, updateTile: Tile => Tile)(pair: (Tile, Int)) = pair match {
        case (t,i) => if (canMove && indices.contains(i)) (updateTile(t), i) else (t, i)
      }

      g.console.log(params.toString)

      val canMoveX = params.x_tl.nonEmpty && params.x_br.nonEmpty
      val canMoveY = params.y_tl.nonEmpty && params.y_br.nonEmpty
      val newTiles = oldTiles.zipWithIndex
        .map(moveEdge(params.x_tl, canMoveX, t => t.copy(tx1 = t.tx1 + move.dx.asInstanceOf[Float])))
        .map(moveEdge(params.x_br, canMoveX, t => t.copy(tx2 = t.tx2 + move.dx.asInstanceOf[Float])))
        .map(moveEdge(params.y_tl, canMoveY, t => t.copy(ty1 = t.ty1 + move.dy.asInstanceOf[Float])))
        .map(moveEdge(params.y_br, canMoveY, t => t.copy(ty2 = t.ty2 + move.dy.asInstanceOf[Float])))
        .map(_._1)

      comp.copy(tiles = if (newTiles map (t => (t.tx2-t.tx1, t.ty2-t.ty1)) exists (dim => dim._1 < d || dim._2 < d)) {
        oldTiles
      } else {
        oldTiles.zip(newTiles).map(resizeTile)
      })
    }

    case x => x
  }

  val margin = 0.05


  def toIndex(t: (Tile, Int)) = t match { case (tile, i) => i }

  def getParams(album: List[Composition], ev: CoordEvent): EdgeParams = {
    def withinMargin(getCoord: Tile => Float, click: Double)(t: (Tile, Int)) = t match {
      case (tile, i) => Math.abs(getCoord(tile) - click) < margin
    }

    // val ev = click.copy(x = click.x/click.w, y = click.y/click.h)
    g.console.log(ev.toString)
    val tiles = album(ev.page).tiles.zipWithIndex
    EdgeParams(
       x_tl = tiles.filter(withinMargin(_.tx1, ev.x)).map(toIndex),
       y_tl = tiles.filter(withinMargin(_.ty1, ev.y)).map(toIndex),
       x_br = tiles.filter(withinMargin(_.tx2, ev.x)).map(toIndex),
       y_br = tiles.filter(withinMargin(_.ty2, ev.y)).map(toIndex)
    )
  }
}
