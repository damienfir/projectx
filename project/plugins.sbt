resolvers += "spray repo" at "http://repo.spray.io"
resolvers += "Typesafe repository" at "https://repo.typesafe.com/typesafe/releases/"

// The Play plugin
addSbtPlugin("com.typesafe.play" % "sbt-plugin" % "2.4.6")

addSbtPlugin("org.scala-js" % "sbt-scalajs" % "0.6.8")

//addSbtPlugin("com.typesafe.sbt" % "sbt-less" % "1.0.6")

//addSbtPlugin("com.typesafe.sbt" % "sbt-native-packager" % "1.0.0")

addSbtPlugin("com.vmunier" % "sbt-play-scalajs" % "0.3.0")

//addSbtPlugin("com.lihaoyi" % "workbench" % "0.2.3")
