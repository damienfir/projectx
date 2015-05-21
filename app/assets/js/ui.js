define(function(require){

  function UI() {

    var mosaic = require("mosaic");
    var ui = require("interface");
    var feedback = require("feedback");
    var share = require("share");
    var ga = require("ga");


    this.showInteractions = function() {
      feedback.show();
    };

    this.submitted = function() {
      ui.loader.init();
      ui.mosaic.clear();
    };

    this.uploading = function(length) {
      ui.collection.reset(length);
      ui.loader.start(length);
    };

    this.uploaded = function(urls) {
      if (urls.length > 0) {
        ui.collection.addPhotos(urls);
      }
    };

    this.progress = function(progress, index) {
      ui.loader.progress(progress, index);
    };

    this.processing = function() {
      ui.mosaic.hideExample();
      ui.collection.selectPhotos();
      ui.loader.processing();
    };

    this.loaded = function(obj) {
      ui.loader.finish();
      ui.mosaic.changeImage(mosaic.getImageURLSmall())
        .then(function() {
          // ui.showInteractions();
        });
      window.history.pushState({}, document.title, mosaic.getViewURL());
    };


    var self = this;
    function bindEvents() {
      // $("#dropzone").hover(ui.dropzone.enter.bind(ui.dropzone), ui.dropzone.leave.bind(ui.dropzone));
      // $("#box-mosaic").hover(ui.mosaic.enter.bind(ui.mosaic), ui.mosaic.leave.bind(ui.mosaic));


      mosaic.watch.add("loaded", self, self.loaded);

      require(["upload"], function(upload){
        upload.watch.add("uploading", self, self.uploading);
        upload.watch.add("uploaded", self, self.uploaded);
        upload.watch.add("progress", self, self.progress);
        upload.watch.add("processing", self, self.processing);
        upload.watch.add("submitted", self, self.submitted);
      });

      // require(["dropbox"], function(dropbox){
      //   dropbox.watch.add("uploading", self, self.uploading);
      //   dropbox.watch.add("progress", self, self.progress);
      //   dropbox.watch.add("processing", self, self.processing);
      //   dropbox.watch.add("submitted", self, self.submitted);
      // });
    }

    // $("#panel-upload .btn").tooltip();
    $("#panel-share .btn").tooltip();
    $("#tryagain").tooltip();

    require(["backend"], function(backend){
      document.getElementById("contact-form").addEventListener("submit", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        var el = ev.target.elements;
        var button = $("#contact-submit-btn").text("Sending...").attr("disabled", "true");
        backend.contact(el.namedItem("email").value, el.namedItem("message").value)
          .then(function(){
            button.text("Thank you !");
          });
        ga("send","event","contact","send-message");
      });
    });

    ui.mosaic.showExample();

    bindEvents();
  }

  return new UI();
});
