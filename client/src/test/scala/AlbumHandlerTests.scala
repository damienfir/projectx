package test.bigpiq

import bigpiq.client.{AlbumHandler, AlbumPot, MovePageLeft}
import bigpiq.shared.Page
import diode.ActionResult.ModelUpdate
import diode.RootModelRW
import diode.data.{Pot, Ready}
import utest._

object AlbumHandlerTests extends TestSuite {

  val data = Ready(AlbumPot(1, "a", "", List(
    Ready(Page(1, 0, Nil)),
    Ready(Page(2, 1, Nil)),
    Ready(Page(3, 2, Nil))
  )))

  def build = new AlbumHandler(new RootModelRW[Pot[AlbumPot]](data))

  override def tests = TestSuite {
    'moveRight {
      val handler = build
      val result = handler.handleAction(data, MovePageLeft(Page(2, 1, Nil)))
      assertMatch(result) {
        case Some(ModelUpdate(Ready(AlbumPot(1, "a", "", List(
        Ready(Page(2, 1, Nil)),
        Ready(Page(1, 0, Nil)),
        Ready(Page(3, 2, Nil))
        ))))) =>
      }
    }
  }

}