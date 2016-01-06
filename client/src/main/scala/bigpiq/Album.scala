package bigpiq.client

import bigpiq.client.views.Move
import bigpiq.shared.Tile

object AlbumUtil {
  def moveCoord(c: (Float, Float), offset: Float): (Float, Float) = {
    val new1 = Math.max(0, c._1 - offset)
    val new2 = new1 + (c._2 - c._1)
    if (new2 > 1) c else (new1, new2)
  }

  def move(tile: Tile, m: Move) : Tile = {
    val (cx1, cx2) = moveCoord((tile.cx1, tile.cx2), m.dx.asInstanceOf[Float])
    val (cy1, cy2) = moveCoord((tile.cy1, tile.cy2), m.dy.asInstanceOf[Float])
    tile.copy(cx1=cx1, cx2=cx2, cy1=cy1, cy2=cy2)
  }
}