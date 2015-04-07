define([
  "backend",
  "dropbox-api"
], function(backend, Dropbox){

  var DropboxModule = function() {
    document.getElementById("dropbox-btn").addEventListener("click", function() {
      Dropbox.choose({
        success: function(files) {
          backend.uploadFromDropbox(JSON.stringify(files)).then(function() {
            console.log("ok");
          });
        },
        linkType: "direct",
        multiselect: true,
        extensions: ['images'],
      });
    });
  };

  return new DropboxModule();

});
