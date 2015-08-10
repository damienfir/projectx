(function(){
  'use strict';

angular.module("ui")
  .service("Collection", Collection)
  .service("Composition", Composition)
  .service("User", User);


/* @ngInject */
function Collection($q, $http, $resource, User) {
  this.resource = $resource("/collections/:id", {}, {
    addPhoto: {url: "/collections/:id/photos", method: "POST"},
  });

  this.upload = function(files, collection) {
    files = getValidFiles(files);

    var defer = $q.defer();

    function chainUpload(index) {
      if (files.length > index) {
        var fd = new FormData();
        fd.append("image", files[index]);
        $http.post("/collections/"+collection._id.$oid+"/photos", fd, {
          transformRequest: angular.identity,
          headers: {'Content-Type': undefined}
        }).then(function(res){
          defer.notify(res.data);
          chainUpload(index+1);
        });
      } else {
        defer.resolve(collection);
      }
    }

    chainUpload(0);

    return defer.promise;
  };

  this.subset = function(collection) {
    return this.resource.newSubset({id: collection._id.$oid}, {}).$promise;
  };

}


/* @ngInject */
function Composition($resource) {
  this.resource = $resource("/mosaics/:id", {}, {
    generate: {url: "/collections/:id/mosaics", method: "POST"}
  });

  this.generate = function(collection){
    return this.resource.generate({id: collection._id.$oid}, {}).$promise;
  };
}


/* @ngInject */
function User($cookies, $resource){
  var self = this;

  this.resource = $resource("/users/:id", {}, {
    newCollection: {url: "/users/:id/collections", method: "POST"}
  });

  this.newCollection = function() {
    return this.getUser().then(function(){
      return self.resource.newCollection({id: self.user._id.$oid}, {}).$promise;
    });
  };

  this.getUser = function() {
    if (this.user === undefined) {

      var user_id = $cookies.bquser;

      if (user_id === undefined) {
        this.user = this.resource.save({}, function(res) {
          $cookies.bquser = res._id.$oid;
        });
      } else {
        this.user = this.resource.get({id: user_id});
      }
    }

    return this.user.$promise;
  };
}

})();
