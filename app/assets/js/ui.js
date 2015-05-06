define(function(require){

  var $ = require("jquery");
  var mosaic = require("mosaic");
  var Q = require("q");
  var ga = require("ga");
  var feedback = require("feedback");
  require("bootstrap");
  var StockGallery = require("stock");

  function UI() {
    var self = this;

    self.img = $('#mosaic-img');
    self.uploadBtn = $("#upload-btn");
    self.uploadModal = $("#upload-modal");


    // var skrollr = require("skrollr");
    // skrollr.init({
    //   forceHeight: false
    // });


    function Loader() {
      var progressbar = $("#progress-bar");
      var progressrow = $("#progress-row");
      var progressUploading = $("#progress-uploading");
      var progressProcessing = $("#progress-processing");
      var total = 1;

      this.init = function() {
        progressbar.width("0%");
        progressrow.fadeTo(400, 1);
        progressUploading.fadeIn();
      };

      this.start = function(length) { total = length; };

      this.progress = function(progress, index) {
        var val = Math.round((progress+index)*100) / total;
        progressbar.width(val + "%");
      };

      this.processing = function() {
        progressbar.width("100%");
        progressbar.addClass("progress-bar-success");
        progressUploading.fadeOut(300, function() { progressProcessing.fadeIn(); });
      };

      this.finish = function() {
        progressrow.fadeTo(400, 0, function() {
          progressbar.removeClass("progress-bar-success");
        });
        progressProcessing.fadeOut();
      };
    }
    self.loader = new Loader();


    function Mosaic() {
      var _self = this;
      var overlayBtn = $("#btn-overlay");
      var overlayStock = $("#img-overlay-stock");

      this.changeImage = function(url) {
        return Q.Promise(function(resolve, reject, notify){
          self.img.load(function(){
            self.img.fadeTo(800, 1, resolve);
            self.img.unbind("load", this);
          });

          self.img.fadeTo(800, 0, function(){
            self.img.attr("src", url);
            notify();
          });
        });
      };

      this.showOverlay = function() {
        overlayStock.fadeIn();
      };

      this.showUpload = function() {
        overlayBtn.fadeIn(400);
      };

      this.hideOverlay = function() {
        overlayStock.fadeOut();
      };
      
      this.hideUpload = function() {
        overlayBtn.fadeOut();
      };
    }
    self.mosaic = new Mosaic();

    self.stockGallery = new StockGallery(self.mosaic);


    function showInteractions() {
      require("share");
      self.uploadBtn.fadeTo(800,1);
      $("#share-btn").fadeTo(800, 1);
      $("#share-list button, #share-list .div-btn").tooltip();
      $("#share-link").val(mosaic.getViewURL());
      $("#goto-btn").attr("href", mosaic.getViewURL());
      feedback.show();
    }


    this.submitted = function() {
      self.mosaic.showOverlay();
      self.uploadModal.modal("hide");
      self.hideShareButtons();
      self.mosaic.hideUpload();
      self.loader.init();
    };

    this.uploading = function(length) {
      self.loader.start(length);
    };

    this.progress = function(progress, index) {
      self.loader.progress(progress, index);
    };

    this.processing = function() {
      self.loader.processing();
    };

    this.loaded = function(obj) {
      self.stockGallery.stop();
      self.mosaic.changeImage(mosaic.getImageURLSmall())
        .then(function(){}, function(){},
        function() {
          self.loader.finish();
          self.mosaic.hideOverlay();
          showInteractions();
        });
      window.history.pushState({}, document.title, mosaic.getViewURL());
    };

    this.hideShareButtons = function() {
      $("#share-btn").fadeTo(800, 0);
    };


    $("#cloud-btn .div-btn").tooltip();

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


    function bindEvents() {

      // Google Analytics triggers
      $(".modal").on("show.bs.modal", function(ev){ ga("send", "pageview", $(ev.target).data("content")); });
      $(".modal").on("show.bs.modal", function(ev){ ga("send", "event", "modal", $(ev.relatedTarget).data("from")); });
      $(".more-info").on("click", function(ev){ ga("send", "event", "more-info", $(ev.target).data("from")); });


      require(["upload"], function(upload){
        upload.watch.add("uploading", self.uploading);
        upload.watch.add("progress", self.progress);
        upload.watch.add("processing", self.processing);
        upload.watch.add("submitted", self.submitted);
      });

      mosaic.watch.add("loaded", self.loaded);

      require(["dropbox"], function(dropbox){
        dropbox.watch.add("uploading", self.uploading);
        dropbox.watch.add("progress", self.progress);
        dropbox.watch.add("processing", self.processing);
        dropbox.watch.add("submitted", self.submitted);
      });
    }

    if (!mosaic.$loaded) {
      self.mosaic.showOverlay();
      self.stockGallery.start().then(function(){
        self.mosaic.showUpload();
        bindEvents();
      });
    } else {
      showInteractions();
      bindEvents();
    }
  }

  var downArrow = document.getElementById("down-arrow");
  function bumpArrow() { downArrow.classList.add("bump"); }
  downArrow.addEventListener("animationend", function() {
    downArrow.classList.remove("bump");
    window.setTimeout(bumpArrow, 5000);
  });
  window.setTimeout(bumpArrow, 3000);

  return new UI();
});
