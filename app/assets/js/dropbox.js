define([
  "backend",
  "dropbox-api",
  "ui",
  "mosaic"
], function(backend, Dropbox, ui, mosaic){

  Dropbox.appKey = "z7bsczzlaqyb8zr";

  var DropboxModule = function() {
    var self = this;

    self.upload = function() {
      Dropbox.choose({
        success: function(files) {
          ui.uploading(1);

          backend.reset()
          .then(function(){
            ui.notify(100,0);
            return backend.uploadFromDropbox(JSON.stringify(files));
          })
          .then(function() {
            ui.processing();
            return backend.process();
          })
          .then(function(res) {
            var obj = JSON.parse(res);
            mosaic.loaded(obj);
            ui.loaded(obj.mosaic);
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
