define([
    "jquery",
    "mosaic",
    "share",
    "observers",
    "backend"
],
function($, mosaic, share, observers, backend){

  function UI() {
    var self = this;

    self.watch = new observers(["loaded"]);

    var btn = $(".upload-btn");
    var btn2;
    var overlay = $("#img-overlay");
    var img = $('#mosaic-img');
    var progressbar = $("#progress-bar");
    var progressrow = $("#progress-row");
    var uploadModal = $("#upload-modal");
    self.timeoutID = 0;
    self.total = 1;

    this.uploading = function(length) {
      self.total = length;
      uploadModal.modal("hide");
      progressbar.width("0%");
      progressrow.fadeTo(400, 1);
      share.hide_buttons();
      self.stopStock();
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
        img.fadeTo(1000, 1, function(){
          share.show_buttons();
        });
      });
      progressrow.fadeTo(400, 0, function() {
        progressbar.removeClass("progress-bar-success");
      });
      img.fadeTo(400, 0, function(){
        img.attr("src", mosaic.getImageURLSmall());
      });

      self.watch.notify("loaded");
    };

    this.startStock = function() {
      backend.stock().then(function(res){
        var list = JSON.parse(res);
        list = list.slice(0, Math.min(6, list.length));
        var images = [];

        list.forEach(function(url) {
          var im = new Image();
          im.src = "/assets/stock/" + url;
          images.push(im);
        });
        return images;
      })
      .then(function(images){
        var i = 0;
        var t = 800;

        function replaceImage(url) {
          if (self.stop) return;

          img.fadeTo(t, 0, function(){
            img.attr("src", url);
            img.fadeTo(t, 0.3, function(){
              i++;
              self.timeoutID = setTimeout(replaceImage, 3000, images[i % images.length].src);
            });
          });
        }
        replaceImage(images[i].src);

        btn2 = btn.clone();
        btn.hide();
        btn2.addClass("overlay-btn");
        $("#mosaic-col").append(btn2);
      });
    };

    this.stopStock = function() {
      overlay.remove();
      btn2.remove();
      btn.show();
      self.stop = true;
      clearTimeout(self.timeoutID);
    };

    self.startStock();
  }

  return new UI();
});
