define(function(require) {
  var backend = require("backend");
  var Q = require("q");

  function StockGallery(mosaicUI, collectionUI) {
    var timeoutID = 0;
    var stop = false;
    var images = [];


    this.start = function() {
      return backend.stock().then(function(res){
        return JSON.parse(res);
      })
      .then(this.cycle.bind(this));
    };


    this.cycle = function(examples) {
      this.fill(examples[1]);
    };


    this.addPhoto = function(url, last, resolve) {
      collectionUI.addPhoto(url);
      if (last) resolve();
    };


    this.fill = function(collection) {
      collectionUI.reset(collection.photos.length);

      collectionUI.addPhotos(collection.photos)
      .then(function(){
        collectionUI.selectPhotos(collection.selected);
      }).then(function() {
        mosaicUI.changeImage(collection.mosaic);
      });
    };

  }

  return StockGallery;
});
