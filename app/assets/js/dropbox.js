define([
  "backend",
  "dropbox-api",
  "ui",
  "mosaic",
  "observers"
], function(backend, Dropbox, ui, mosaic, observers){

  Dropbox.appKey = "z7bsczzlaqyb8zr";

  var DropboxModule = function() {
    var self = this;
    self.watch = new observers(["uploading","progress","processing","loaded","failed","submitted"]);

    self.upload = function() {
      self.watch.notify("submitted");
      Dropbox.choose({
        success: function(files) {
          self.watch.notify("uploading", [files.length]);

          backend.reset()
          .then(function(){
            self.watch.notify("progress", [100, 0]);
            return backend.uploadFromDropbox(JSON.stringify(files));
          })
          .then(function() {
            self.watch.notify("processing");
            return backend.process();
          })
          .then(function(res) {
            var obj = JSON.parse(res);
            self.watch.notify("loaded", [obj]);
            mosaic.loaded(obj);
          })
          .fail(function(error){
            console.log(error);
          });
        },
        linkType: "direct",
        multiselect: true,
        extensions: ['images'],
      });
    };

    document.getElementById("dropbox-btn").addEventListener("click", self.upload);
  };

  return new DropboxModule();
});
