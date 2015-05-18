define(function(require){

  function Events() {

    var mosaic = require("mosaic");
    var ui = require("ui");
    var ga = require("ga");

    this.submitted = function() {
      ui.loader.init();
      ui.gallery.stop();
      ui.mosaic.clear();
      ui.mosaic.hideOverlay();
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
      $("#dropzone").hover(ui.dropzone.enter, ui.dropzone.leave);
      $("#box-mosaic").hover(ui.mosaic.enter, ui.mosaic.leave);

      // Google Analytics triggers
      $(".modal").on("show.bs.modal", function(ev){ ga("send", "pageview", $(ev.target).data("content")); });
      $(".modal").on("show.bs.modal", function(ev){ ga("send", "event", "modal", $(ev.relatedTarget).data("from")); });
      $(".more-info").on("click", function(ev){ ga("send", "event", "more-info", $(ev.target).data("from")); });

      mosaic.watch.add("loaded", self, self.loaded);

      require(["upload"], function(upload){
        upload.watch.add("uploading", self, self.uploading);
        upload.watch.add("uploaded", self, self.uploaded);
        upload.watch.add("progress", self, self.progress);
        upload.watch.add("processing", self, self.processing);
        upload.watch.add("submitted", self, self.submitted);
      });

      require(["dropbox"], function(dropbox){
        dropbox.watch.add("uploading", self, self.uploading);
        dropbox.watch.add("progress", self, self.progress);
        dropbox.watch.add("processing", self, self.processing);
        dropbox.watch.add("submitted", self, self.submitted);
      });
    }

    if (!mosaic.$loaded) {
      // if (mosaic.$loaded) {
      ui.mosaic.showOverlay();
      ui.gallery.start().then(function(){
        // this.mosaic.showUpload();
        bindEvents();
      });
    } else {
      ui.showInteractions();
      bindEvents();
    }

  }

  return new Events();
});
