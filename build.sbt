name := """projectx"""

version := "1.0-SNAPSHOT"

lazy val root = (project in file(".")).enablePlugins(PlayScala)

scalaVersion := "2.11.7"

libraryDependencies ++= Seq(
  jdbc,
  cache,
  ws,
  "commons-codec" % "commons-codec" % "1.9",
  "commons-io" % "commons-io" % "2.4",
  // "org.postgresql"      %   "postgresql"    % "9.4-1200-jdbc4",
  "org.reactivemongo" %% "play2-reactivemongo" % "0.11.2.play24",
  "javax.mail" % "mail" % "1.4.7"
)

libraryDependencies +=  "org.scalaj" %% "scalaj-http" % "1.1.4"

// routesGenerator := InjectedRoutesGenerator

//pipelineStages := Seq(rjs)

//fork in run := true
