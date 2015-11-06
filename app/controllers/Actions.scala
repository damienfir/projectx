package controllers

import play.api.mvc._
import scala.util.{Try, Success, Failure}
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import scala.concurrent.Future
import play.api.libs.json._

import models._


trait CRUDActions[T <: DBModels.HasID] extends Controller {
  implicit val format: Format[T]

  def getAction(query: Future[Option[T]]) = Action.async {
    query map {
      case Some(item) => Ok(Json.toJson(item))
      case None => NotFound
    }
  }

  def saveAction(insertQuery: T => Future[T], updateQuery: T => Future[Try[_]]) = Action.async(parse.json) { request =>
    val item = request.body.as[T]
    (item.id match {
      case Some(id) => updateQuery(item)
      case None => insertQuery(item) map (Success(_))
    }) map {
      case Success(newItem: T) => Ok(Json.toJson(newItem))
      case Success(_) => Ok(Json.toJson(item))
      case Failure(_) => BadRequest
    }
  }

  def listAction(query: Future[Seq[T]]) = Action.async {
    query map { items =>
      Ok(Json.toJson(items))
    }
  }

  def deleteAction(query: Future[Int]) = Action.async {
    query map {
      case 1 => Ok
      case 0 => NotFound
    }
  }
}


