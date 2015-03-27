package controllers


// trait CloudHandler


// case class DropboxFile(name: String, link: String, icon: String, bytes: Int, thumbnailLink: String)

// trait Dropbox extends CloudHandler {
//   implicit val dropboxForm = Json.format[DropboxFile]

//   def dropboxDownload(files: List[DropboxFile])(implicit sess: String) = {
//     val filenames = files map { f =>
//       ImageManager.save(Http(f.link).asBytes.body)
//     }
//   }
// }
