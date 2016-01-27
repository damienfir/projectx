import sbt._
import org.scalajs.sbtplugin.ScalaJSPlugin.autoImport._

/**
  * Application settings. Configure the build for your application here.
  * You normally don't have to touch the actual build definition after this.
  */
object Settings {
  /** The name of your application */
  val name = "bigpiq"

  /** The version of your application */
  val version = "0.8.1"

  /** Options for the scala compiler */
  val scalacOptions = Seq(
    "-Xlint",
    "-unchecked",
    "-deprecation",
    "-feature"
  )

  /** Declare global dependency versions here to avoid mismatches in multi part dependencies */
  object versions {
    val scala = "2.11.7"
    val scalaDom = "0.8.2"
    val scalajsReact = "0.10.2"
    val scalaCSS = "0.3.1"
    val log4js = "1.4.10"
    val autowire = "0.2.5"
//    val booPickle = "1.1.0"
    val diode = "0.3.0"
    val uTest = "0.3.1"

    val react = "0.14.3"
    val jQuery = "1.11.1"
    val bootstrap = "3.3.5"

    val playScripts = "0.3.0"
  }

  val jvmDependencies = Def.setting(Seq(
      "commons-codec" % "commons-codec" % "1.9",
      "commons-io" % "commons-io" % "2.4",
      "org.postgresql" % "postgresql" % "9.4-1201-jdbc41",
      "com.typesafe.play" %% "play-slick" % "1.0.1",
      "com.typesafe.play" %% "play-slick-evolutions" % "1.0.1",
      "com.github.tminglei" %% "slick-pg" % "0.9.1",
      "com.braintreepayments.gateway" % "braintree-java" % "2.52.0",
      "com.vmunier" %% "play-scalajs-scripts" % "0.3.0",
      "com.lihaoyi" %%% "upickle" % "0.3.6",
      "org.webjars" % "font-awesome" % "4.3.0-1" % Provided,
      "org.webjars" % "bootstrap" % "3.3.2" % Provided
    ))

  val scalajsDependencies = Def.setting(Seq(
      "com.github.japgolly.scalajs-react" %%% "core" % "0.10.2",
      "com.github.japgolly.scalajs-react" %%% "extra" % "0.10.2",
      "com.github.japgolly.scalacss" %%% "ext-react" % "0.3.1",
      "me.chrons" %%% "diode" % "0.3.0",
      "me.chrons" %%% "diode-react" % "0.3.0",
      "org.scala-js" %%% "scalajs-dom" % "0.8.2",
      "com.lihaoyi" %%% "upickle" % "0.3.6",
      "be.doeraene" %%% "scalajs-jquery" % "0.8.1"
    ))

  /** Dependencies for external JS libs that are bundled into a single .js file according to dependency order */
  val jsDependencies = Def.setting(Seq(
    "org.webjars.bower" % "react" % versions.react / "react-with-addons.js" minified "react-with-addons.min.js" commonJSName "React",
    "org.webjars.bower" % "react" % versions.react / "react-dom.js" minified "react-dom.min.js" dependsOn "react-with-addons.js" commonJSName "ReactDOM",
    "org.webjars" % "jquery" % versions.jQuery / "jquery.js" minified "jquery.min.js",
    "org.webjars" % "bootstrap" % versions.bootstrap / "bootstrap.js" minified "bootstrap.min.js" dependsOn "jquery.js",
    "org.webjars" % "log4javascript" % versions.log4js / "js/log4javascript_uncompressed.js" minified "js/log4javascript.js"
  ))
}
