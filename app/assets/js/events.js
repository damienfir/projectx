define(function(require){

  function Events() {

    var mosaic = require("mosaic");
    var ui = require("ui");

    this.submitted = function() {
      ui.mosaic.showOverlay();
      ui.loader.init();
    };

    this.uploading = function(length) {
      ui.loader.start(length);
    };

    this.progress = function(progress, index) {
      ui.loader.progress(progress, index);
    };

    this.processing = function() {
      ui.loader.processing();
    };

    this.loaded = function(obj) {
      ui.gallery.stop();
      ui.mosaic.changeImage(mosaic.getImageURLSmall())
        .then(function() {
          ui.loader.finish();
          ui.mosaic.hideOverlay();
          ui.showInteractions();
        });
      window.history.pushState({}, document.title, mosaic.getViewURL());
    };

    var self = this;
    function bindEvents() {
      $("#dropzone").hover(ui.dropzone.enter, ui.dropzone.leave);

      // Google Analytics triggers
      $(".modal").on("show.bs.modal", function(ev){ ga("send", "pageview", $(ev.target).data("content")); });
      $(".modal").on("show.bs.modal", function(ev){ ga("send", "event", "modal", $(ev.relatedTarget).data("from")); });
      $(".more-info").on("click", function(ev){ ga("send", "event", "more-info", $(ev.target).data("from")); });

      mosaic.watch.add("loaded", self, self.loaded);

      require(["upload"], function(upload){
        upload.watch.add("uploading", self, self.uploading);
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
