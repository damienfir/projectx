import sbt.Keys._
import sbt.Project.projectToRef
import com.lihaoyi.workbench.Plugin._


lazy val scalaV = "2.11.7"

// a special crossProject for configuring a JS/JVM/shared structure
lazy val shared = (crossProject.crossType(CrossType.Pure) in file("shared"))
  .settings(
    scalaVersion := Settings.versions.scala,
    libraryDependencies ++= Seq(
      "com.lihaoyi" %%% "autowire" % "0.2.5",
      "com.lihaoyi" %%% "utest" % "0.3.1",
      "com.lihaoyi" %%% "upickle" % "0.3.6"
    )
  )
  // set up settings specific to the JS project
  .jsConfigure(_ enablePlugins ScalaJSPlay)

lazy val sharedJVM = shared.jvm
lazy val sharedJS = shared.js


// use eliding to drop some debug code in the production build
lazy val elideOptions = settingKey[Seq[String]]("Set limit for elidable functions")

// instantiate the JS project for SBT with some additional settings
lazy val client: Project = (project in file("client"))
  .settings(
    // name := "client",
    // version := Settings.version,
    scalaVersion := scalaV,
    // scalacOptions ++= Settings.scalacOptions,
    libraryDependencies ++= Seq(
      "com.github.japgolly.scalajs-react" %%% "core" % "0.10.2",
      "com.github.japgolly.scalajs-react" %%% "extra" % "0.10.2",
      "com.github.japgolly.scalacss" %%% "ext-react" % "0.3.1",
      "me.chrons" %%% "diode" % "0.3.0",
      "me.chrons" %%% "diode-react" % "0.3.0",
      "org.scala-js" %%% "scalajs-dom" % "0.8.2",
      "com.lihaoyi" %%% "upickle" % "0.3.6",
      "be.doeraene" %%% "scalajs-jquery" % "0.8.1",
      "org.monifu" %%% "monifu" % "1.0"
    ),
    // by default we do development build, no eliding
    elideOptions := Seq(),
    scalacOptions ++= elideOptions.value,
    jsDependencies ++= Settings.jsDependencies.value,
    // RuntimeDOM is needed for tests
    jsDependencies += RuntimeDOM % "test",
    // yes, we want to package JS dependencies
    skip in packageJSDependencies := false,
    // use Scala.js provided launcher code to start the client app
    persistLauncher := true,
    persistLauncher in Test := false,
    // use uTest framework for tests
    testFrameworks += new TestFramework("utest.runner.Framework")
//    workbenchSettings,
//    bootSnippet := "bigpiq.client.App().main();",
//    updateBrowsers <<= updateBrowsers.triggeredBy(fastOptJS in Compile)
  )
  .enablePlugins(ScalaJSPlugin, ScalaJSPlay)
  .dependsOn(sharedJS)

// Client projects (just one in this case)
lazy val clients = Seq(client)

// instantiate the JVM project for SBT with some additional settings
lazy val server = (project in file("server"))
  .settings(
    // name := "server",
    // version := Settings.version,
    scalaVersion := scalaV,
    // scalacOptions ++= Settings.scalacOptions,
    libraryDependencies ++= Seq(
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
      "com.braintreepayments.gateway" % "braintree-java" % "2.52.0",
      "com.vmunier" %% "play-scalajs-scripts" % "0.3.0",
      "org.webjars" % "font-awesome" % "4.3.0-1" % Provided,
      "org.webjars" % "bootstrap" % "3.3.2" % Provided
    ),
  routesGenerator := InjectedRoutesGenerator,
  commands += ReleaseCmd,
    // connect to the client project
    scalaJSProjects := clients,
    pipelineStages := Seq(scalaJSProd),
    // compress CSS
    LessKeys.compress in Assets := true
  )
  .enablePlugins(PlayScala)
  .disablePlugins(PlayLayoutPlugin) // use the standard directory layout instead of Play's custom
  .aggregate(clients.map(projectToRef): _*)
  .dependsOn(sharedJVM)

// Command for building a release
lazy val ReleaseCmd = Command.command("release") {
  state => "set elideOptions in client := Seq(\"-Xelide-below\", \"WARNING\")" ::
    "client/clean" ::
    "client/test" ::
    "server/clean" ::
    "server/test" ::
    "server/dist" ::
    "set elideOptions in client := Seq()" ::
    state
}

// lazy val root = (project in file(".")).aggregate(client, server)

// loads the Play server project at sbt startup
onLoad in Global := (Command.process("project server", _: State)) compose (onLoad in Global).value
