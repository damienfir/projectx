package controllers

import play.api._
import play.api.mvc._
import scala.util.{Try, Success, Failure, Random}
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import scala.concurrent.Future

import models._
import services._

import play.api.libs.json.Json

import reactivemongo.api._
import reactivemongo.bson._
import play.modules.reactivemongo.MongoController
import play.modules.reactivemongo.json.collection._

import reactivemongo.bson._
import play.modules.reactivemongo.json.BSONFormats._




object Application extends Controller with MongoController {
  import JsonFormats._

  def userCollection = db.collection[JSONCollection]("users")
  def mosaicCollection = db.collection[JSONCollection]("mosaics")


  private def getUser(implicit request: Request[_]): Future[Option[User]] = request.session.get("user") match {
    case Some(user_id) => userCollection.find(Json.obj("_id" -> Json.obj("$oid" -> user_id))).one[User]
    case None => Future(None)
  }


  private def getOrCreateUser(implicit request: Request[_]): Future[User] = getUser flatMap {
    case Some(user) => Future(user)
    case None => {
      val user = User(BSONObjectID.generate, None)
      userCollection.insert(user) map { _ =>
        user
      }
    }
  }

  private def getMosaicFromID(id: String): Future[Option[Mosaic]] = {
    mosaicCollection.find(Json.obj("_id" -> Json.obj("$oid" -> id))).one[Mosaic]
  }

  private def getMosaic(implicit request: Request[_]): Future[Option[Mosaic]] = {
    request.session.get("mosaic") match {
      case Some(mosaic_id) => getMosaicFromID(mosaic_id)
      case None => Future(None)
    }
  }


  def index(filename: String) = Action.async { implicit request =>
    getOrCreateUser map { user =>
      Ok(views.html.index(filename)).withSession(
        "user" -> user._id.stringify
      )
    } flatMap { result =>
      filename match {
        case "" => Future(result)
        case mosaic_id => getMosaicFromID(mosaic_id) map { _ map { mosaic =>
          result.addingToSession("mosaic" -> mosaic._id.stringify)
        } getOrElse (result)
        }
      }
    }
  }


  def reset = Action.async { implicit request =>
    getUser flatMap { _ map { user =>
        val id = BSONObjectID.generate
        mosaicCollection.insert(Mosaic(id, user._id, None, None, List())) map { _ =>
          Ok.withSession(
            "user" -> user._id.stringify,
            "mosaic" -> id.stringify
          )
        }
      } getOrElse(Future(BadRequest))
    }
  }


  def upload = Action.async(parse.multipartFormData) { implicit request =>
    getMosaic flatMap { _ map { mosaic =>
        MosaicService.addImages(request.body.files.map(_.ref).toList) flatMap { addToMosaic(mosaic, _) }
      } getOrElse(Future(BadRequest))
    }
  }


  def process = Action.async { implicit request =>
    getMosaic flatMap { _ map { mosaic =>
        MosaicService.process(mosaic) flatMap {
          case Success(processed) =>
            mosaicCollection.save(processed) map { lastError =>
              Ok(Json.toJson(processed).toString)
            }
          case Failure(e) => Future(InternalServerError)
        }
      } getOrElse(Future(BadRequest))
    }
  }


  def dropbox = Action.async(parse.json) { implicit request =>
    getMosaic flatMap { _ map { mosaic =>
        Dropbox.download(request.body) flatMap { addToMosaic(mosaic, _) }
      } getOrElse(Future(BadRequest))
    }
  }


  private def addToMosaic(mosaic: Mosaic, names: List[String]): Future[Result] = {
    mosaicCollection.save(mosaic.copy(images = mosaic.images ++ names)) map { _ => Ok }
  }

  def download = Action.async(parse.urlFormEncoded) { implicit request =>
    getUser flatMap {
      _ flatMap { user =>
        request.body.get("email") map { email =>
          userCollection.save(user.copy(email = email.headOption))
        }
      } map { lastError =>
        getMosaic map {
          _ flatMap { mosaic =>
            mosaic.filename map { fname =>
              Ok.sendFile(MosaicService.getFile(fname))
            }
          } getOrElse(BadRequest)
        }
      } getOrElse(Future(BadRequest))
    }
  }


  def stock = Action {
    Ok(Json.toJson(ImageService.listStock))
  }

}

object Feedback extends Controller with MongoController {

  import JsonFormats._

  def questionCollection = db.collection[JSONCollection]("questions")
  def feedbackCollection = db.collection[JSONCollection]("feedbacks")

  
  def questions = Action.async {
    questionCollection.find(Json.obj()).cursor[FeedbackQuestion].collect[List]() map { questions =>
      Ok(Json.toJson(questions))
    }
  }

  def feedback = Action.async(parse.json) { request =>
    val user_id = request.session.get("user") map (BSONObjectID(_))
    feedbackCollection.save(request.body.as[Feedback].copy(user_id = user_id)) map { lastError =>
      Ok
    }
  }
}
