define(function(require){

  var $ = require("jquery");
  var mosaic = require("mosaic");
  var Q = require("q");
  var ga = require("ga");
  var backend = require("backend");
  var feedback = require("feedback");
  require("bootstrap");

  function UI() {
    this.share_btn = $("#share-btn");
    this.uploadModal = $("#upload-modal");

    // var skrollrModule = require("skrollr");
    // var skrollrMenu = require("skrollr-menu");
    // var skrollr = skrollrModule.init({
    //   forceHeight: false
    // });
    // skrollrMenu.init(skrollr);


    function Loader() {
      // var progressbar = $("#progress-bar");
      // var progressrow = $("#progress-row");
      var arrowDown = $("#arrow-down");
      var arrowRight = $("#arrow-right");
      var progressUploading = $("#progress-uploading");
      var progressProcessing = $("#progress-processing");
      this.total = 1;

      this.init = function() {
        // progressbar.width("0%");
        // progressrow.fadeTo(400, 1);
        progressUploading.fadeIn(300, function(){ console.log("faded in"); });
      };

      this.start = function(length) { this.total = length; };

      this.progress = function(progress, index) {
        // var val = Math.round((progress+index)*100) / this.total;
        // progressbar.width(val + "%");
      };

      this.processing = function() {
        // progressbar.width("100%");
        // progressbar.addClass("progress-bar-success");
        progressUploading.fadeOut();
        progressProcessing.fadeIn();
      };

      this.finish = function() {
        // progressrow.fadeTo(400, 0, function() {
        //   progressbar.removeClass("progress-bar-success");
        // });
        progressProcessing.fadeOut();
      };
    }
    this.loader = new Loader();


    function Dropzone() {
      this.enter = function() {
        $("#cloud-btn").removeClass("invisible").addClass("visible");
        $("#droptext").html("Drag or click");
      };

      this.leave = function() {
        $("#cloud-btn").removeClass("visible").addClass("invisible");
        $("#droptext").html("Upload your photos");
      };
    }


    function Collection() {
      var box = document.getElementById("photos-collection");
      this.photos = [];
      var ratio = 1.45;
      var min_columns = 3;

      this.reset = function(length) {
        var col = Math.max(min_columns, Math.floor(Math.sqrt(length)));
        this.width = 100 / col;
        var height = ((box.offsetWidth / col) / ratio) * Math.ceil(length / col);
        box.style.height = height+"px";
        while(box.firstChild) { box.removeChild(box.firstChild); }
        this.photos = [];
      };

      this.addPhotos = function(urls) {
        var self = this;

        return Q.Promise(function(resolve) {
          urls.forEach(function(url, i, array) {
            setTimeout(function() {
              self.addPhoto(url);
              if (i == array.length-1) resolve();
            }, i*100);
            i++;
          });
        });
      };

      this.addPhoto = function(url) {
        var img = document.createElement("img");
        img.style.backgroundImage = "url("+url+")";
        img.style.width = this.width+"%";
        img.style.paddingBottom = (this.width/ratio)+"%";
        box.appendChild(img);
        // img.classList.add("photo-muted");
        setTimeout(function(){
          img.style.opacity = 0.1;
        }, 0);
        this.photos.push(img);
      };

      this.selectPhotos = function(indices) {
        indices = indices || this.photos.map(function(_,i){ return i; });
        var self = this;

        return Q.Promise(function(resolve) {
          indices.forEach(function(index, i, array) {
            setTimeout(function(){
              self.selectPhoto(index);
              if (i == array.length-1) resolve();
            }, index*100);
          });
        });
      };

      this.selectPhoto = function(index) {
        var img = this.photos[index].style.opacity = 0.5;
      };
    }


    function Mosaic() {
      var img = $('#mosaic-img');
      var _theme = $("#img-desc");
      var overlayStock = $("#img-overlay-stock");
      this.theme = undefined;
      var self = this;

      this.changeImage = function(url, theme) {
        this.theme = theme;
        return Q.Promise(function(resolve, reject, notify){
          img.one("load", function(){
            img.fadeTo(800, 1, resolve);

            if (self.theme !== undefined) {
              window.setTimeout(function(){
                _theme.fadeTo(800, 1);
              }, 400);
            }
          });

          img.fadeTo(800, 0, function(){
            img.attr("src", url);
            notify();
          });

          window.setTimeout(function(){
            if (self.theme === undefined) {
              _theme.fadeOut(800, function() {
                _theme.children("span").html("");
              });
            } else {
              _theme.fadeTo(800, 0, function() {
                _theme.children("span").html(self.theme);
              });
            }
          }, 400);
        });
      };

      this.clear = function() {
        img.attr("src", "");
      };

      this.showOverlay = function() { overlayStock.fadeIn(); };
      this.hideOverlay = function() { overlayStock.fadeOut(); };

      this.enter = function() {
        $("#panel-share").removeClass("invisible").addClass("visible");
        // $("#droptext").html("Drag or click");
      };

      this.leave = function() {
        $("#panel-share").removeClass("visible").addClass("invisible");
        // $("#droptext").html("Upload your photos");
      };
    }


    function Gallery() {
      this.timeout_id = 0;
      this.stop_timeout = false;

      this.start = function() {
        return backend.stock().then(function(res){
          return JSON.parse(res);
        })
        .then(this.cycle.bind(this));
      };

      this.stop = function() {
        this.stop_timeout = true;
        clearTimeout(this.timeout_id);
      };

      this.cycle = function(examples, cycle_index) {
        if (!this.stop_timeout) {
          var index = cycle_index || 0;
          this.fill(examples[index]).then(function() {
            this.timeout_id = setTimeout(this.cycle.bind(this), 5000, examples, (index + 1) % examples.length);
          }.bind(this));
        }
      };


      this.addPhoto = function(url, last, resolve) {
        self.collection.addPhoto(url);
        if (last) resolve();
      };


      this.fill = function(collection) {
        self.collection.reset(collection.photos.length);

        return self.collection.addPhotos(collection.photos).then(function(){
          if (!this.stop_timeout) {
            self.collection.selectPhotos(collection.selected);
            return self.mosaic.changeImage(collection.mosaic);
          }
        }.bind(this));
      };
    }

    var self = this;
    this.dropzone = new Dropzone();
    this.collection = new Collection();
    this.mosaic = new Mosaic();
    this.gallery = new Gallery();


    this.showInteractions = function() {
      require("share");
      this.share_btn.removeClass("invisible").addClass("visible");
      this.share_btn.children("button").tooltip();
      $("#share-list button, #share-list .div-btn").tooltip();
      $("#share-link").val(mosaic.getViewURL());
      $("#goto-btn").attr("href", mosaic.getViewURL());
      feedback.show();
    };


    this.hideShareButtons = function() {
      this.share_btn.removeClass("visible").addClass("invisible");
    };

    $("#panel-upload .btn").tooltip();
    $("#panel-share .btn").tooltip();

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



    // var downArrow = document.getElementById("down-arrow");
    // function bumpArrow() { downArrow.classList.add("bump"); }
    // downArrow.addEventListener("animationend", function() {
    //   downArrow.classList.remove("bump");
    //   window.setTimeout(bumpArrow, 5000);
    // });
    // window.setTimeout(bumpArrow, 3000);
  }


  return new UI();
});
