package bigpiq.client

import bigpiq.client.components.{EdgeParams, UI, Selected}
import bigpiq.shared.{Page, Tile}
import UI._

import scala.scalajs.js.Dynamic.{global => g}
import scala.util.Try


object AlbumUtil {
  def moveCoord(c: (Float, Float), offset: Double): (Float, Float) = {
    val new1 = Math.max(0, c._1 - offset.asInstanceOf[Float])
    val new2 = new1 + (c._2 - c._1)
    if (new2 > 1) c else (new1, new2)
  }

  def moveTile(tile: Tile, m: Move) : Tile = {
    val (cx1, cx2) = moveCoord((tile.cx1, tile.cx2), m.dx)
    val (cy1, cy2) = moveCoord((tile.cy1, tile.cy2), m.dy)
    val newT = tile.copy(cx1=cx1, cx2=cx2, cy1=cy1, cy2=cy2)
    newT
  }

  def move(album: List[Page], move: Move) = album.map {
    case comp@Page(_, move.down.page, tiles) =>
      Try(tiles(move.down.idx))
        .map(moveTile(_, move))
        .map(tiles.updated(move.down.idx, _))
        .map(tiles => comp.copy(tiles = tiles))
        .getOrElse(comp)
    case x => x
  }

  def rotateTile(tile: Tile): Tile =
    resizeTile(tile, tile, transpose = true).copy(rot = (tile.rot+90) % 360)

  def rotate(album: List[Page], selected: Selected): List[Page] = album map {
    case comp@Page(_, selected.page, tiles) =>
      comp.copy(tiles = tiles.updated(selected.index, rotateTile(tiles(selected.index))))
    case x => x
  }

  def swapTiles(album: List[Page], from: Selected, to: Selected): List[Page] = album map {
    case comp@Page(_, from.page, oldTiles) => {
      val fromTile = oldTiles(from.index)
      val toTile = oldTiles(to.index)
      comp.copy(tiles = oldTiles
        .updated(to.index, resizeTile(fromTile, toTile))
        .updated(from.index, resizeTile(toTile, fromTile))
      )
    }
    case x => x
  }

  val arPaper = Math.sqrt(2).asInstanceOf[Float]

  def resizeTile(a: Tile, b: Tile, transpose: Boolean = false): Tile = {
    val arTile = arPaper * ((a.tx2-a.tx1) / (a.ty2-a.ty1))
    val arImg = arTile / ((a.cx2-a.cx1) / (a.cy2-a.cy1))
    val arTile2 = arPaper * (b.tx2-b.tx1) / (b.ty2-b.ty1)
    val arImg2 = if (transpose) 1/arImg else arImg

    val center = ((a.cx2+a.cx1)/2.0, (a.cy2+a.cy1)/2.0)

    val c = if (arImg2 < arTile2) b.copy(cx2 = 1, cy2 = arImg2/arTile2, cx1 = 0, cy1 = 0)
      else b.copy(cx2 = arTile2/arImg2, cy2 = 1, cx1 = 0, cy1 = 0)

    val dx = Math.min(1-c.cx2, Math.max(0, center._1-c.cx2/2.0)).asInstanceOf[Float]
    val dy = Math.min(1-c.cy2, Math.max(0, center._2-c.cy2/2.0)).asInstanceOf[Float]
    c.copy(cx1 = c.cx1+dx, cx2 = c.cx2+dx, cy1 = c.cy1+dy, cy2 = c.cy2+dy, photo = a.photo)
  }

  val d = 0.1

  def edge(album: List[Page], params: EdgeParams, move: Move): List[Page] = album map {
    case comp@Page(_, move.down.page, oldTiles) => {
      def moveEdge(indices: List[Int], canMove: Boolean, updateTile: Tile => Tile)(pair: (Tile, Int)) = pair match {
        case (t,i) => if (canMove && indices.contains(i)) (updateTile(t), i) else (t, i)
      }

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
        oldTiles.zip(newTiles).map({ case (a,b) => resizeTile(a,b) })
      })
    }

    case x => x
  }

  val margin = 0.05


  def getParams(album: List[Page], ev: MouseDown): EdgeParams = {
    def closeEnough(getCoord: Tile => Float, click: Double, f: Double)(t: (Tile, Int)) = {
      Math.abs(getCoord(t._1) - click/f) < margin
    }

    val tiles = album(ev.page).tiles.zipWithIndex
    EdgeParams(
       x_tl = tiles.filter(closeEnough(_.tx1, ev.x, ev.w)).map(_._2),
       y_tl = tiles.filter(closeEnough(_.ty1, ev.y, ev.h)).map(_._2),
       x_br = tiles.filter(closeEnough(_.tx2, ev.x, ev.w)).map(_._2),
       y_br = tiles.filter(closeEnough(_.ty2, ev.y, ev.h)).map(_._2)
    )
  }
}