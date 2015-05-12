define([
  "q",
  "backend",
  "ui",
  "mosaic",
  "observers",
  "ga"
], function(Q, backend, ui, mosaic, observers, ga){

  function Add() {
    var self = this;
    self.watch = new observers(["uploading","progress","processing","loaded","failed","submitted"]);

    var dropzone = document.getElementById("dropzone");
    var dropicon = document.getElementById("dropicon");
    var fileupload = document.getElementById("file-upload");

    this.uploadFiles = function(files) {
      self.watch.notify("uploading", [files.length]);

      backend.reset()
        .then(function() {
          return Q.Promise(function(resolve, reject){
            function chainUpload(index) {
              if (files.length > index) {
                backend.uploadFile(files[index]).then(
                    function(res){
                      chainUpload(index+1);
                    }, reject,
                    function(progress) {
                      self.watch.notify("progress", [progress, index]);
                    });
              } else {
                resolve();
              }
            }
            chainUpload(0);
          });
        })
      .then(function(){
        self.watch.notify("processing");
        return backend.process();
      }, function(reason) {
        console.log(reason);
      })
      .then(function(res){
        var obj = JSON.parse(res);
        self.watch.notify("loaded", [obj]);
        mosaic.loaded(obj);
      })
      .fail(function(reason){
        self.watch.notify("failed", [reason]);
      });
    };

    this.dropHandler = function(ev) {
      console.log("dropped");
      ev.stopPropagation();
      ev.preventDefault();
      self.watch.notify("submitted");
      ga("send", "event", "upload", "local", "drop");

      var files = ev.dataTransfer.files;
      self.uploadFiles(files);
    };

    this.dragenterHandler = function(ev) {
      console.log("dragged");
      ev.stopPropagation();
      ev.preventDefault();
      ev.dataTransfer.dropEffect = 'copy';
    };

    this.triggerClick = function(ev) {
      console.log("ok");
      fileupload.dispatchEvent(new MouseEvent("click"));
    };

    this.submitHandler = function(ev) {
      ev.stopPropagation();
      ev.preventDefault();
      ga("send", "event", "upload", "local", "button");
      self.watch.notify("submitted");
      var files = fileupload.files;
      self.uploadFiles(files);
    };

    dropzone.addEventListener("dragover", self.dragenterHandler);
    dropzone.addEventListener("drop", self.dropHandler);
    dropzone.addEventListener("click", this.triggerClick);
    fileupload.addEventListener("change", this.submitHandler);
  }

  return new Add();
});
