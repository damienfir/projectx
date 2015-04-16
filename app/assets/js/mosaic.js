define([
  "observers"
], function(observers){

  function Mosaic(){
    var self = this;
    self.watch = new observers(["loaded"]);

    self.hostURL = window.location.protocol + "//" + window.location.hostname;
    if (window.location.port !== "") self.hostURL += ":" + window.location.port;
    self.hostURL += "/";

    self.baseURL = self.hostURL + "storage/generated/";

    self.$loaded = false;
    self.hash = undefined;
    self.filename = undefined;
    self.filename_small = undefined;

    this.loadFromURL = function() {
      var path = window.location.pathname.split('/');
      if (path.length > 1 && path[1] !== "") {
        var obj = {id: path[1], filename: path[1]+".jpg", thumbnail: path[1]+"_display.jpg"};
        self.loaded(obj);
      }
    };

    this.loaded = function(obj) {
      self.setHash(obj.id);
      self.filename = obj.filename;
      self.filename_small = obj.thumbnail;
      self.watch.notify("loaded", [obj]);
      self.$loaded = true;
    };

    this.setHash = function(hash) {
      self.hash = hash;
    };

    this.getHash = function() {
      return self.hash;
    };

    this.getViewURL = function() {
      return self.hostURL + self.hash;
    };

    this.getImageURL = function() {
      return self.baseURL + self.filename;
    };

    this.getImageURLSmall = function() {
      return self.baseURL + self.filename_small;
    };
    
    this.loadFromURL();
  }

  return new Mosaic();
});
