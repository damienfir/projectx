import Grunt._
import play.PlayImport.PlayKeys.playRunHooks


name := """projectx"""

version := "0.7.2"

lazy val root = (project in file(".")).enablePlugins(PlayScala)

scalaVersion := "2.11.7"

offline := true

libraryDependencies ++= Seq(
  // jdbc,
  cache,
  ws,
  "commons-codec" % "commons-codec" % "1.9",
  "commons-io" % "commons-io" % "2.4",
  "org.postgresql" % "postgresql" % "9.4-1201-jdbc41",
  // "org.reactivemongo" %% "play2-reactivemongo" % "0.11.2.play24",
  // "com.h2database" % "h2" % "1.4.188",
  "com.typesafe.play" %% "play-slick" % "1.0.1",
  "com.typesafe.play" %% "play-slick-evolutions" % "1.0.1",
  "javax.mail" % "mail" % "1.4.7",
  "org.scalaj" %% "scalaj-http" % "1.1.4",
  "com.github.tminglei" %% "slick-pg" % "0.9.1",
  "com.braintreepayments.gateway" % "braintree-java" % "2.52.0"
)

routesGenerator := InjectedRoutesGenerator

playRunHooks <+= baseDirectory.map(base => Grunt(base))


// forget about documentation
sources in (Compile, doc) := Seq.empty
publishArtifact in (Compile, packageDoc) := false
