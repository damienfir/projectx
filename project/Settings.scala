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
  val version = "0.9.1"

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
    val scalajsJquery = "0.8.1"
    val scalajsReact = "0.10.2"
    val scalaCSS = "0.3.1"
    val autowire = "0.2.5"
    val upickle = "0.3.6"
    val diode = "0.3.0"
    val uTest = "0.3.1"

    val react = "0.14.3"
    val jQuery = "2.1.3"
    val bootstrap = "3.3.5"
    val fontawesome = "4.4.0"

    val playScripts = "0.3.0"

    val postgresql = "9.4-1201-jdbc41"
    val playslick = "1.1.1"
    val slickPg = "0.9.1"

    val scalatest = "2.2.1"
    val scalatestplus = "1.4.0-M3"
  }

  val jvmDependencies = Def.setting(Seq(
    "commons-codec" % "commons-codec" % "1.9",
    "commons-io" % "commons-io" % "2.4",
    "org.postgresql" % "postgresql" % versions.postgresql,
    "com.typesafe.play" %% "play-slick" % versions.playslick,
    "com.typesafe.play" %% "play-slick-evolutions" % versions.playslick,
    "com.github.tminglei" %% "slick-pg" % versions.slickPg,
    "com.vmunier" %% "play-scalajs-scripts" % versions.playScripts,
    "com.lihaoyi" %%% "upickle" % versions.upickle,
    "com.lihaoyi" %%% "autowire" % versions.autowire,
    "org.scalatest" %% "scalatest" % versions.scalatest % "test",
    "org.scalatestplus" %% "play" % versions.scalatestplus % "test",
    "com.drewnoakes" % "metadata-extractor" % "2.9.1"

    //      "org.webjars" % "font-awesome" % versions.fontawesome % Provided,
    //      "org.webjars" % "bootstrap" % versions.bootstrap % Provided
  ))

  val scalajsDependencies = Def.setting(Seq(
    "com.github.japgolly.scalajs-react" %%% "core" % versions.scalajsReact,
    "com.github.japgolly.scalajs-react" %%% "extra" % versions.scalajsReact,
    //      "com.github.japgolly.scalacss" %%% "ext-react" % "0.3.1",
    "me.chrons" %%% "diode" % versions.diode,
    "me.chrons" %%% "diode-react" % versions.diode,
    "org.scala-js" %%% "scalajs-dom" % versions.scalaDom,
    "com.lihaoyi" %%% "upickle" % versions.upickle,
    "com.lihaoyi" %%% "autowire" % versions.autowire,
    "be.doeraene" %%% "scalajs-jquery" % versions.scalajsJquery
  ))

  /** Dependencies for external JS libs that are bundled into a single .js file according to dependency order */
  val jsDependencies = Def.setting(Seq(
    "org.webjars.bower" % "react" % versions.react / "react-with-addons.js" minified "react-with-addons.min.js" commonJSName "React",
    "org.webjars.bower" % "react" % versions.react / "react-dom.js" minified "react-dom.min.js" dependsOn "react-with-addons.js" commonJSName "ReactDOM",
    "org.webjars" % "jquery" % versions.jQuery / "jquery.js" minified "jquery.min.js",
    "org.webjars" % "bootstrap" % versions.bootstrap / "bootstrap.js" minified "bootstrap.min.js" dependsOn "jquery.js"
  ))
}
