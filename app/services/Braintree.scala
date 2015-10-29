package services

import javax.inject._
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import scala.concurrent.Future
import com.braintreegateway._;

@Singleton
class Braintree {
  val gateway = new BraintreeGateway(
      Environment.SANDBOX,
      "9pzcg59d9xd7dbqb",
      "d2y86xcpw9pvrmx5",
      "1c0fd5e3d0a19812e4802dec008955e3"
    );

  def token = Future(gateway.clientToken().generate())
}
