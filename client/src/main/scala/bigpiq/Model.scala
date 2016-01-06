package bigpiq.client

import bigpiq.shared._
import diode.data.{RefTo, Empty, Pot}

case class RootModel(
  user: Pot[User] = Empty,
  photos: List[Photo] = List(),
  collection: Pot[Collection] = Empty,
  album: Pot[List[Composition]] = Empty
)
