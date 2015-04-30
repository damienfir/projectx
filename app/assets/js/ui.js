define(function(require){

  var $ = require("jquery"),
      mosaic = require("mosaic"),
      Q = require("q"),
      ga = require("ga");

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
        overlayStock.fadeIn();
        // overlayShare.fadeOut(100, function(){ overlayStock.fadeIn(); });
        btn2 = self.uploadBtn.clone();
        btn2.addClass("overlay-btn");
        $("#mosaic-col").append(btn2);
        btn2.fadeTo(600, 1);
      };

      this.forShare = function() {
        progressLoader.fadeOut();
        overlayStock.fadeOut();
        // overlayStock.fadeOut(100, function(){ overlayShare.fadeIn(); });
      };

      this.showUploading = function() {
        if (mosaic.$loaded) overlayShare.fadeOut(100, function(){ overlayStock.fadeIn(); });
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
      var backend = require("backend");

      this.start = function() {
        self.mosaic.forStock();
        return backend.stock().then(function(res){
          return Q.Promise(function(resolve, reject, notify){
            var list = JSON.parse(res);
            list = list.slice(0, Math.min(6, list.length));
            list.forEach(function(url) {
              var im = new Image();
              im.src = "/assets/stock/" + url;
              images.push(im);
              console.log("loading "+images.length);
              if (images.length === 1) {
                console.log("resolving");
                resolve();
              }
            });
          });
        })
        .then(function(){
          console.log("resolved");
          var i = 0;
          function replaceImage(url) {
            if (stop) return;
            self.mosaic.changeImage(url).then(function(){
              i++;
              timeoutID = setTimeout(replaceImage, 3000, images[i % images.length].src);
            });
          }
          console.log(images.length);
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
      var backend = require("backend");
      var questionEl = $("#feedback-question");
      var choicesEl = $("#feedback-choices");
      var panel = $("#feedback-panel");
      var questions = [];
      var currentQuestion;

      function showQuestion(question) {
        currentQuestion = question._id;
        questionEl.html(question.question);
        choicesEl.empty();
        for (var i = 0; i < question.choices.length; i++) {
          var btn = $("<button></button>").addClass("btn btn-primary").data("index", i).html(question.choices[i]);
          choicesEl.append(btn);
        }
      }

      function showForm() {
        choicesEl.empty();
        questionEl.html("<p>Thank you for your feedback !</p>");
        var textarea = $("<textarea class='form-control' placeholder='Let us know if you have anything else to add'></textarea>");
        var submitButton = $('<button class="btn btn-primary btn-block">Send</button>');
        submitButton.click(function(){
          ga("send", "event", "feedback", "submitted-text");
          backend.textFeedback(textarea.val()).then(function() {
            panel.find(".panel-title").html("Thank you!");
            panel.removeClass("panel-primary").addClass("panel-success");
            pullDown(panel);
          });
          submitButton.html("Thank you").attr("disabled","true");
        });
        questionEl.append($("<div class='form-group'></div>").append(textarea), submitButton);
        textarea.focus();
      }

      function nextQuestion() {
        if (questions.length > 0) {
          showQuestion(questions.shift());
        } else {
          showForm();
        }
      }

      this.getQuestions = function() {
        backend.questions().then(function(list){
          questions = JSON.parse(list);
          questions = questions.slice(0, Math.min(3, questions.length));
          nextQuestion();
        });
      };

      this.submitFeedback = function(ev) {
        backend.feedback(currentQuestion, $(ev.target).data("index"));
        nextQuestion();
        ga("send", "event", "feedback", "answered-question");
      };

      this.show = function() { if (questions.length) panel.fadeIn(); };
      this.hide = function() { panel.fadeOut(); };

      choicesEl.on("click", "button", this.submitFeedback);

      function pullDown(element) {
        element.css("bottom", "-"+(element.height()-35)+"px");
      }

      panel.hover(
        function(){
          $(this).css("bottom", "-10px");
          ga("send", "event", "feedback", "opened-panel");
        },
        function(){ pullDown($(this)); }
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

    function stopStock() {
      self.stockGallery.stop();
      self.loader.finish();
    }

    function showInteractions() {
      require("share");
      self.mosaic.forShare();
      self.showShareButtons();
      self.showUploadButton();
      self.feedback.show();
    }

    this.loaded = function(obj) {
      stopStock();
      $("#title-phrase").fadeOut();
      self.mosaic.changeImage(mosaic.getImageURLSmall())
        .then(function(){}, function(){}, showInteractions);
      window.history.pushState({}, document.title, mosaic.getViewURL());
    };

    this.showUploadButton = function() {
      self.uploadBtn.fadeTo(600,1);
    };

    this.hideUploadBtn = function() {

    };

    this.showShareButtons = function() {
      $("#share-btn").fadeTo(600, 1);
      $("#share-list button, #share-list .div-btn").tooltip();
      $("#share-link").val(mosaic.getViewURL());
      $("#goto-btn").attr("href", mosaic.getViewURL());
    };

    this.hideShareButtons = function() {
      $("#share-btn").fadeTo(800, 0);
    };


    require("bootstrap");
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
      self.feedback.getQuestions();

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
      self.stockGallery.start().then(function(){
        bindEvents();
      });
    } else {
      stopStock();
      showInteractions();
      bindEvents();
    }
  }

  return new UI();
});
