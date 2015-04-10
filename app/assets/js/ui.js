define([
    "jquery",
    "mosaic",
    "share",
    "observers"
],
function($, mosaic, share, observers){

  function UI() {
    var self = this;

    self.watch = new observers(["loaded"]);

    var img = $('#mosaic-img');
    var progressbar = $("#progress-bar");
    var progressrow = $("#progress-row");
    var uploadModal = $("#upload-modal");
    self.total = 1;

    this.uploading = function(length) {
      self.total = length;
      uploadModal.modal("hide");
      progressbar.width("0%");
      progressrow.fadeTo(400, 1);
      share.hide_buttons();
    };

    this.notify = function(progress, index) {
      var val = Math.round((progress+index)*100) / self.total;
      progressbar.width(val + "%");
    };

    this.processing = function() {
      progressbar.width("100%");
      progressbar.addClass("progress-bar-success");
    };

    this.loaded = function(filename) {
      img.load(function() {
        img.fadeIn(1000, function(){
          share.show_buttons();
        });
      });
      progressrow.fadeTo(400, 0, function() {
        progressbar.removeClass("progress-bar-success");
      });
      img.fadeOut(function(){
        img.attr("src", mosaic.getImageURLSmall());
      });

      self.watch.notify("loaded");
    };
  }

  return new UI();
});
