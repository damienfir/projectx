package services

import play.api.Play
import scala.util.{Try, Success, Failure}
import javax.inject._
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import scala.concurrent.Future
import com.braintreegateway._;
import scala.collection.JavaConversions._

import models.APIModels

@Singleton
class Braintree {
  val environment = Play.current.configuration.getString("px.braintree-environment").get
  val merchantID = Play.current.configuration.getString("px.braintree-merchant-id").get
  val publicKey = Play.current.configuration.getString("px.braintree-public-key").get
  val privateKey = Play.current.configuration.getString("px.braintree-private-key").get

  val gateway = new BraintreeGateway(
    if (environment.equals("production")) Environment.PRODUCTION else Environment.SANDBOX,
    merchantID,
    publicKey,
    privateKey
  );

  def printErrors[T](res: Result[T]) = 
    res.getErrors.getAllDeepValidationErrors.toList.foreach(err => println(err.getCode + " " + err.getMessage))

  def token = Future(gateway.clientToken().generate())

  def order(order: APIModels.Order, info: APIModels.Info) : Future[Transaction] = {

    val customerRequest = new CustomerRequest()
      .id(order.userID.toString)
      .firstName(info.firstName)
      .lastName(info.lastName)
      .email(info.email)

    Future { gateway.customer().find(order.userID.toString)
    } map { customer => gateway.customer.update(order.userID.toString, customerRequest)
    } recover { case _ => gateway.customer.create(customerRequest)
    } map { result =>
      if (result.isSuccess) {
        gateway.transaction().sale(new TransactionRequest()
          .amount(BigDecimal.valueOf(order.price.toDouble).underlying)
          .paymentMethodNonce(order.nonce)
          .customerId(result.getTarget.getId)
          .customField("collection_id", order.collectionID.toString)
          .shippingAddress()
          .countryCodeAlpha2(info.country)
          .firstName(info.firstName)
          .lastName(info.lastName)
          .locality(info.city)
          .postalCode(info.zip)
          .streetAddress(info.address)
          .done())
      } else {
        printErrors(result)
        throw new Exception("cannot create customer")
      }
    } map { res => 
      if (res.isSuccess) {
        res.getTarget
      } else {
        printErrors(res)
        throw new Exception("error without transaction")
      }
    }
  }
}
