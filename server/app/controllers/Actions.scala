package controllers

import play.api.mvc._
import scala.util.{Try, Success, Failure}
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import scala.concurrent.Future
import play.api.libs.json._

import models._
import bigpiq.shared._
import upickle.default._


// trait CRUDActions[T <: HasID] extends Controller {

//   def getAction(query: Future[Option[T]]) = Action.async {
//     query map {
//       case Some(item) => Ok(write(item))
//       case None => NotFound
//     }
//   }

//   def saveAction(insertQuery: T => Future[T], updateQuery: T => Future[Try[_]]) = Action.async(parse.text) { request =>
//     // val item = request.body.as[T]
//     val item = read[T](request.body)
//     (item.id match {
//       case Some(id) => updateQuery(item)
//       case None => insertQuery(item) map (Success(_))
//     }) map {
//       case Success(newItem: T) => Ok(write(newItem))
//       case Success(_) => Ok(write(item))
//       case Failure(_) => BadRequest
//     }
//   }

//   def listAction(query: Future[Seq[T]]) = Action.async {
//     query map { items =>
//       Ok(write(items))
//     }
//   }

//   def deleteAction(query: Future[Int]) = Action.async {
//     query map {
//       case 1 => Ok
//       case 0 => NotFound
//     }
//   }
// }
