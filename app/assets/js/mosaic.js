define(function(){

  function Mosaic(){
    var self = this;
    self.baseURL = "http://localhost/";

    this.hash = undefined;

    this.load_from_url = function() {
      var path = window.location.pathname.split('/');
      console.log(path.length);
      if (path.length > 1 && path[1] !== "") {
        self.set_hash(path[1]);
      }
    };

    this.loaded = function(obj) {
      self.set_hash(obj.mosaic);
    };

    this.set_hash = function(hash) {
      self.hash = hash;
    };

    this.get_hash = function() {
      return self.hash;
    };

    this.load_from_url();

    this.getViewURL = function() {
      return self.baseURL + self.hash;
    };

    this.getImageURL = function() {
      return self.baseURL + "assets/mosaics/" + self.hash;
    };
  }

  return new Mosaic();
});
