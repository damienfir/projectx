package bigpiq.client

import scala.scalajs.js.Dynamic.{global => g}

import bigpiq.client.views.Move
import bigpiq.shared.{Composition, Tile}

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
}