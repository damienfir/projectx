require(['config'], function(){
  require(['interface', 'backend'], function(ui, backend){

  function Front(){

    function Gallery() {
      this.timeout_id = 0;
      this.stop_timeout = false;

      this.start = function() {
        return backend.stock().then(function(res){
          return JSON.parse(res);
        })
        .then(function(examples){
          setTimeout(this.cycle.bind(this), 4000, examples);
        }.bind(this));
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
        ui.collection.addPhoto(url);
        if (last) resolve();
      };


      this.fill = function(collection) {
        ui.collection.reset(collection.photos.length);

        return ui.collection.addPhotos(collection.photos).then(function(){
          if (!this.stop_timeout) {
            return ui.collection.selectPhotos(collection.selected);
          }
        }.bind(this)).then(function() {
          if (!this.stop_timeout) {
            return ui.mosaic.changeImage(collection.mosaic);
          }
        });
      };
    }

    this.gallery = new Gallery();
    this.gallery.start();
  }

  Front();

  });
});
