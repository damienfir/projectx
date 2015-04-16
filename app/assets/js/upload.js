define([
  "q",
  "backend",
  "ui",
  "mosaic",
  "observers"
], function(Q, backend, ui, mosaic, observers){

  function Add() {
    var self = this;
    self.watch = new observers(["uploading","progress","processing","loaded","failed","submitted"]);

    var dropzone = document.getElementById("dropzone");
    var dropicon = document.getElementById("dropicon");

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
      ev.stopPropagation();
      ev.preventDefault();
      self.watch.notify("submitted");

      var files = ev.dataTransfer.files;
      self.uploadFiles(files);
      dropicon.classList.remove("fa-download");
      dropicon.classList.add("fa-check");
    };

    this.dragenterHandler = function(ev) {
      ev.stopPropagation();
      ev.preventDefault();
      ev.dataTransfer.dropEffect = 'copy';
      dropicon.classList.remove("fa-picture-o");
      dropicon.classList.add("fa-download");
      dropzone.classList.add("dragover");
    };

    this.dragleaveHandler = function(ev) {
      ev.stopPropagation();
      ev.preventDefault();
      var el = document.getElementById("dropicon");
      dropicon.classList.remove("fa-download");
      dropicon.classList.add("fa-picture-o");
      dropzone.classList.remove("dragover");
    };

    this.submitHandler = function(ev) {
      ev.stopPropagation();
      ev.preventDefault();
      self.watch.notify("submitted");
      var files = document.getElementById("file-upload").files;
      self.uploadFiles(files);
    };

    dropzone.addEventListener("dragover", self.dragenterHandler);
    dropzone.addEventListener("dragleave", self.dragleaveHandler);
    dropzone.addEventListener("drop", self.dropHandler);
    document.getElementById("upload-form").addEventListener("submit", this.submitHandler);
    document.getElementById("file-upload").addEventListener("change", this.submitHandler);
  }

  return new Add();
});