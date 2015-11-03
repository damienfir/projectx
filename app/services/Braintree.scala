package services

import scala.util.{Try, Success, Failure}
import javax.inject._
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import scala.concurrent.Future
import com.braintreegateway._;
import scala.collection.JavaConversions._

import models.APIModels

@Singleton
class Braintree {
  val gateway = new BraintreeGateway(
      Environment.SANDBOX,
      "9pzcg59d9xd7dbqb",
      "d2y86xcpw9pvrmx5",
      "1c0fd5e3d0a19812e4802dec008955e3"
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
