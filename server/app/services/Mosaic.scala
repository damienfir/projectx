package bigpiq.server.services

import javax.inject._
import java.util.UUID
import scala.util.{Try, Success, Failure}
import scala.util.control.Exception
import scala.concurrent.Future
import scala.io.Source
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import scala.sys.process._
import play.api.libs.json._
import play.api.Play
import play.api.libs.Files.TemporaryFile
import java.io._

import models._
import bigpiq.shared._
import bigpiq.server.db


class MosaicService @Inject()() {


}
