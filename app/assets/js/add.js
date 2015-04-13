define([
  "jquery",
  "bootstrap",
  "q",
  "backend",
  "ui",
  "mosaic"
], function($, _bs, Q, backend, ui, mosaic){

  var self = this;
  var dropzone = document.getElementById("dropzone");
  var dropicon = document.getElementById("dropicon");

  $("#cloud-btn .div-btn").tooltip();

  this.uploadFiles = function(files) {
    ui.uploading(files.length);

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
                  ui.notify(progress, index);
                });
          } else {
            resolve();
          }
        }
        chainUpload(0);
      });
    })
    .then(function(){
      ui.processing();
      return backend.process();
    }, function(reason) {
      console.log(reason);
    })
    .then(function(res){
      var obj = JSON.parse(res);
      mosaic.loaded(obj);
      ui.loaded(obj.mosaic);
    });
  };

  this.dropHandler = function(ev) {
    ev.stopPropagation();
    ev.preventDefault();
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
    var files = document.getElementById("file-upload").files;
    self.uploadFiles(files);
  };

  dropzone.addEventListener("dragover", self.dragenterHandler);
  dropzone.addEventListener("dragleave", self.dragleaveHandler);
  dropzone.addEventListener("drop", self.dropHandler);
  document.getElementById("upload-form").addEventListener("submit", this.submitHandler);
  document.getElementById("file-upload").addEventListener("change", this.submitHandler);
});