define(function(require) {
  var backend = require("backend");
  var Q = require("q");

  function StockGallery(mosaicUI) {
    var timeoutID = 0;
    var stop = false;
    var images = [];

    this.start = function() {
      return backend.themes().then(function(res){
        return Q.Promise(function(resolve, reject, notify){
          var list = JSON.parse(res);
          list = list.slice(0, Math.min(6, list.length));
          list.forEach(function(obj) {
            var im = new Image();
            im.src = "/assets/themes/" + obj.filename;
            images.push({"image": im, "theme": obj.theme});
            if (images.length === 1) {
              resolve();
            }
          });
        });
      })
      .then(function(){
        return Q.Promise(function(resolve) {
        var i = 0;
        function replaceImage(theme) {
          if (stop) return;
          mosaicUI.changeImage(theme.image.src, theme.theme).then(function(){
            if (i === 0) resolve();
            i++;
            timeoutID = setTimeout(replaceImage, 3000, images[i % images.length]);
          });
        }
        replaceImage(images[i]);
        });
      });
    };

    this.stop = function() {
      stop = true;
      clearTimeout(timeoutID);
    };
  }

  return StockGallery;
});
