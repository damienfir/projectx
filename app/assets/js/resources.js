define([
    'app'
], function(bq){

  bq.factory("User", ["$resource", function($resource){
    return $resource("/users/:id", {}, {
      newCollection: {url: "/users/:id/collections", method: "POST"}
    });
  }]);


  bq.factory("Subset", ["$resource", function($resource) {
    return $resource("/subsets/:id", {}, {
      generateMosaic: {url: "/subset/:id/mosaics", method: "POST"}
    });
  }]);

  bq.factory("Collection", ["$resource", function($resource){
    return $resource("/collections/:id", {}, {
      addPhoto: {url: "/collections/:id/photos", method: "POST"},
      newSubset: {url: "/collections/:id/subsets", method: "POST"}
    });
  }]);

});
