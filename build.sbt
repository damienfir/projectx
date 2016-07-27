import sbt.Keys._
import sbt.Project.projectToRef

lazy val server = (project in file("server"))
  .settings(
    version := Settings.version,
    scalaVersion := Settings.versions.scala,
    routesGenerator := InjectedRoutesGenerator,
    scalaJSProjects := clients,
    pipelineStages := Seq(scalaJSProd),
    libraryDependencies ++= Settings.jvmDependencies.value :+ ws
  )
  .enablePlugins(PlayScala)
  .aggregate(clients.map(projectToRef): _*)
  .dependsOn(sharedJVM)

lazy val client = (project in file("client"))
  .settings(
    version := Settings.version,
    scalaVersion := Settings.versions.scala,
    jsDependencies ++= Settings.jsDependencies.value,
    skip in packageJSDependencies := false,
    persistLauncher := true,
    persistLauncher in Test := false,
    libraryDependencies ++= Settings.scalajsDependencies.value
)
  .enablePlugins(ScalaJSPlugin, ScalaJSPlay)
  .dependsOn(sharedJS)

lazy val clients = Seq(client)

lazy val shared = (crossProject.crossType(CrossType.Pure) in file("shared"))
  .settings(
    scalaVersion := Settings.versions.scala
  )
  .jsConfigure(_ enablePlugins ScalaJSPlay)

lazy val sharedJVM = shared.jvm
lazy val sharedJS = shared.js

onLoad in Global := (Command.process("project server", _: State)) compose (onLoad in Global).value
