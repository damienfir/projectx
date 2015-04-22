define([
    "jquery",
    "mosaic",
    "share",
    "observers",
    "backend",
    "upload",
    "q"
],
function($, mosaic, share, observers, backend, upload, Q){

  function UI() {
    var self = this;

    self.uploadBtn = $(".upload-btn");
    self.img = $('#mosaic-img');
    self.uploadModal = $("#upload-modal");


    function Loader() {
      var progressbar = $("#progress-bar");
      var progressrow = $("#progress-row");
      var total = 1;

      this.init = function() {
        progressbar.width("0%");
        progressrow.fadeTo(400, 1);
      };

      this.start = function(length) { total = length; };

      this.progress = function(progress, index) {
        var val = Math.round((progress+index)*100) / total;
        progressbar.width(val + "%");
      };

      this.processing = function() {
        progressbar.width("100%");
        progressbar.addClass("progress-bar-success");
      };

      this.finish = function() {
        progressrow.fadeTo(400, 0, function() {
          progressbar.removeClass("progress-bar-success");
        });
      };
    }
    self.loader = new Loader();


    function Mosaic() {
      var _self = this;
      var btn2;
      var overlayStock = $("#img-overlay-stock");
      var overlayShare = $("#img-overlay-share");
      var progressLoader = $("#progress-loader");

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

      this.forStock = function() {
        overlayShare.fadeOut(100, overlayStock.fadeIn);
        btn2 = self.uploadBtn.clone();
        btn2.addClass("overlay-btn");
        $("#mosaic-col").append(btn2);
        btn2.fadeTo(600, 1);
      };

      this.forShare = function() {
        progressLoader.fadeOut();
        overlayStock.fadeOut(100, overlayShare.fadeIn);
      };

      this.showUploading = function() {
        if (btn2 !== undefined) btn2.remove();
        progressLoader.children("img").attr("src","/assets/images/358.GIF");
        progressLoader.children("span").html("Uploading");
        progressLoader.fadeIn();
      };

      this.showProcessing = function() {
        progressLoader.fadeOut(30, function(){
          progressLoader.children("img").attr("src", "/assets/images/285.GIF");
          progressLoader.children("span").html("Processing");
          progressLoader.fadeIn();
        });
      };
    }
    self.mosaic = new Mosaic();


    function StockGallery() {
      var timeoutID = 0;
      var stop = false;
      var images = [];

      this.start = function() {

        backend.stock().then(function(res){
          return Q.Promise(function(resolve, reject, notify){
            var list = JSON.parse(res);
            list = list.slice(0, Math.min(6, list.length));
            list.forEach(function(url) {
              var im = new Image();
              im.src = "/assets/stock/" + url;
              images.push(im);
              if (images.length === 1) resolve();
            });
          });
        })
        .then(function(){
          var i = 0;
          function replaceImage(url) {
            if (stop) return;
            self.mosaic.changeImage(url).then(function(){
              if (i === 0) { self.mosaic.forStock(); }
              i++;
              timeoutID = setTimeout(replaceImage, 3000, images[i % images.length].src);
            });
          }
          replaceImage(images[i].src);
        });
      };

      this.stop = function() {
        stop = true;
        clearTimeout(timeoutID);
      };
    }
    self.stockGallery = new StockGallery();

    
    function Feedback() {

      function showQuestion(question) {
        $("#feedback-question").html(question.question);
        var choicesEl = $("#feedback-choices").empty();
        for (var i = 0; i < question.choices.length; i++) {
          var btn = $("<button></button>").addClass("btn btn-primary").data("index", i).html(question.choices[i]);
          choicesEl.append(btn);
        }
      }

      this.getQuestions = function() {
        backend.questions().then(function(list){
          var questions = JSON.parse(list);
          showQuestion(questions[0]);
        });
      };

      this.submitFeedback = function(el) {
        var btn = el.target;
        // console.log(btn);
        // backend.feedback(btn)
      };

      $("#feedback-choices button").on("click", this.submitFeedback);

      $("#feedback-panel").hover(
        function(){ $(this).css("bottom", "0px"); },
        function(){ $(this).css("bottom", "-235px"); }
      );
    }
    self.feedback = new Feedback();


    this.submitted = function() {
      self.uploadModal.modal("hide");
      self.hideShareButtons();
      self.loader.init();
      self.mosaic.showUploading();
    };

    this.uploading = function(length) {
      self.loader.start(length);
    };

    this.progress = function(progress, index) {
      self.loader.progress(progress, index);
    };

    this.processing = function() {
      self.loader.processing();
      self.mosaic.showProcessing();
    };

    this.loaded = function(obj) {
      self.stockGallery.stop();
      self.loader.finish();
      self.mosaic.forShare();
      self.mosaic.changeImage(mosaic.getImageURLSmall())
        .then(function() {
          self.showShareButtons();
          self.showUploadBtn();
        });
    };

    this.showUploadBtn = function() {
      self.uploadBtn.fadeTo(300,1);
    };

    this.hideUploadBtn = function() {

    };

    this.showShareButtons = function() {
      $("#share-btn").fadeTo(400, 1);
      $("#share-list button, #share-list .div-btn").tooltip();
      $("#share-link").val(mosaic.getViewURL());
      $("#goto-btn").attr("href", mosaic.getViewURL());
    };

    this.hideShareButtons = function() {
      $("#share-btn").fadeTo(400, 0);
    };


    $("#cloud-btn .div-btn").tooltip();


    upload.watch.add("uploading", self.uploading);
    upload.watch.add("progress", self.progress);
    upload.watch.add("processing", self.processing);
    upload.watch.add("submitted", self.submitted);
    mosaic.watch.add("loaded", self.loaded);


    if (!mosaic.$loaded) {
      self.stockGallery.start();
    } else {
      self.stockGallery.stop();
    }

    self.feedback.getQuestions();
  }

  return new UI();
});
