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
  def themeCollection = db.collection[JSONCollection]("themes")
  def stockCollection = db.collection[JSONCollection]("stocks")


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


  def index(filename: String) = Action {
    filename match {
      case "" => Ok(views.html.index(""))
      case f: String => Ok(views.html.ui(f))
    }
  }

  def ui = Action {
    Ok(views.html.ui(""))
  }


  def reset = Action.async { implicit request =>
    getOrCreateUser flatMap {  user =>
      val id = BSONObjectID.generate
      mosaicCollection.insert(Mosaic(id, user._id, None, None, List())) map { _ =>
        Ok.withSession(
          "user" -> user._id.stringify,
          "mosaic" -> id.stringify
        )
      }
    }
  }


  def upload = Action.async(parse.multipartFormData) { implicit request =>
    getMosaic flatMap { _ map { mosaic =>
      MosaicService.addImages(request.body.files.map(_.ref).toList) map { names =>
          addToMosaic(mosaic, names)
          println(names map (n => s"/storage/thumb/$n"))
          Ok(Json.stringify(Json.arr(names map ("/storage/thumb/" + _))))
        }
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
    request.body.get("email") map(_.head) map { email =>
      getUser map {
        case Some(user) => userCollection.save(user.copy(email = Some(email)))
      }
      getMosaic map {
        case Some(mosaic) =>
          EmailService.sendToSelf(email, mosaic._id.stringify)
          mosaic.filename map { fname =>
            Ok.sendFile(MosaicService.getFile(fname))
          } getOrElse(BadRequest)
      }
    } getOrElse(Future(BadRequest))
  }

  def email = Action.async(parse.json) { implicit request =>
    val req = request.body.as[Email]
    getUser map {
      case Some(user) => userCollection.save(user.copy(email = Some(req.from)))
    }
    getMosaic map {
      case Some(mosaic) =>
        EmailService.sendToFriend(req.to, req.from, mosaic._id.stringify)
        Ok
      case None => BadRequest
    }
  }


  def stock = Action.async {
    stockCollection.find(Json.obj()).cursor[Stock].collect[List]() map { stocks =>
      Ok(Json.toJson(stocks))
    }
  }

  def themes = Action.async {
    themeCollection.find(Json.obj()).cursor[Theme].collect[List]() map { themes =>
      Ok(Json.toJson(themes))
    }
  }

}

object Feedback extends Controller with MongoController {

  import JsonFormats._

  def questionCollection = db.collection[JSONCollection]("questions")
  def feedbackCollection = db.collection[JSONCollection]("feedbacks")
  def contactCollection = db.collection[JSONCollection]("contacts")

  
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

  def textFeedback = Action.async(parse.json) { request =>
    val user_id = request.session.get("user") map (BSONObjectID(_))
    feedbackCollection.save(request.body.as[TextFeedback].copy(user_id = user_id)) map { lastError =>
      Ok
    }
  }

  def contact = Action.async(parse.json) { request =>
    val user_id = request.session.get("user") map (BSONObjectID(_))
    contactCollection.save(request.body.as[ContactFeedback].copy(user_id=user_id)) map { lastError =>
      Ok
    }
  }
}
