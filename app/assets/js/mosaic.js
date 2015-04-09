define(function(){

  function Mosaic(){
    var self = this;
    self.hostname = "//" + window.location.hostname + ":" + window.location.port;
    self.baseURL = self.hostname + "/storage/generated/";

    self.hash = undefined;
    self.filename = undefined;
    self.filename_small = undefined;

    this.load_from_url = function() {
      var path = window.location.pathname.split('/');
      console.log(path.length);
      if (path.length > 1 && path[1] !== "") {
        self.set_hash(path[1]);
      }
    };

    this.loaded = function(obj) {
      self.setHash(obj.id);
      self.filename = obj.mosaic;
      self.filename_small = obj.display;
    };

    this.setHash = function(hash) {
      self.hash = hash;
    };

    this.getHash = function() {
      return self.hash;
    };

    this.load_from_url();

    this.getViewURL = function() {
      return self.hostname + self.hash;
    };

    this.getImageURL = function() {
      return self.baseURL + self.filename;
    };

    this.getImageURLSmall = function() {
      return self.baseURL + self.filename_small;
    };
  }

  return new Mosaic();
});
