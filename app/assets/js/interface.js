define(function(require){

  var $ = require("jquery");
  var Q = require("q");
  var ga = require("ga");
  require("bootstrap");

  function Interface() {
    this.share_btn = $("#share-btn");
    this.uploadModal = $("#upload-modal");


    function Loader() {
      // var progressbar = $("#progress-bar");
      // var progressrow = $("#progress-row");
      var arrowDown = $("#arrow-down");
      var arrowRight = $("#arrow-right");
      var progressUploading = $("#progress-uploading");
      var progressProcessing = $("#progress-processing");
      var tryagain = $("#tryagain");
      var share_panel = $("#panel-share");
      var overlay = $("#overlay-collection");
      this.total = 1;

      this.init = function() {
        // progressbar.width("0%");
        // progressrow.fadeTo(400, 1);
        progressUploading.fadeIn();
        tryagain.fadeOut();
        share_panel.fadeOut();
        overlay.fadeOut();
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
        progressProcessing.fadeOut(400, function(){
          overlay.fadeIn(400, function(){
            tryagain.fadeIn();
          });
        });
        share_panel.fadeIn();
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
      var ratio = 1.41;
      var min_columns = 3;
      var max_rows = 10;

      this.reset = function(length) {
        var col = Math.max(min_columns, Math.floor( 0.7 * Math.sqrt(length)));
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
          img.style.opacity = 0.3;
        }, 0);
        this.photos.push(img);
      };

      this.selectPhotos = function(indices) {
        indices = indices || this.photos.map(function(_,i){ return i; });
        console.log(indices);

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
        var img = this.photos[index].style.opacity = 1;
      };
    }


    function Mosaic() {
      var img = $('#mosaic-img');
      var _theme = $("#img-desc");
      var appear = $("#mosaic-appear");
      
      this.changeImage = function(url) {
        return Q.Promise(function(resolve, reject, notify){
          img.one("load", function(){
            img.fadeTo(800, 1, resolve);
          });

          img.fadeTo(800, 0, function(){
            img.attr("src", url);
            notify();
          });
        });
      };

      this.clear = function() {
        img.attr("src", "");
      };

      this.showExample = function() {
        img.one("load", function() {
          img.fadeTo(300, 0.2);
        });
        img.fadeTo(0,0);
        img.attr("src", "/assets/stock/people/mosaic.jpg");
        appear.fadeIn();
      };

      this.hideExample = function() {
        appear.fadeOut();
      };
    }

    var self = this;
    this.dropzone = new Dropzone();
    this.collection = new Collection();
    this.mosaic = new Mosaic();
  }

  return new Interface();
});
