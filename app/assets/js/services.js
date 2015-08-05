(function(){
  'use strict';

angular.module("ui")
  .service("Collection", Collection)
  .service("Composition", Composition)
  .service("User", User);


/* @ngInject */
function Collection($q, $http, User, Users, Collections) {

  this.create = function() {
    return User.getUser().then(function(user){
      return Users.newCollection({id: user._id.$oid}, {}).$promise;
    });
  };

  this.upload = function(files, collection) {

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
    return Collections.newSubset({id: collection._id.$oid}, {}).$promise;
  };

}


/* @ngInject */
function Composition(Compositions, $location) {

  var hostURL = $location.protocol() + "://" + $location.host();
  if ($location.port() !== 80) hostURL += ":" + $location.port();
  var baseURL = hostURL + "/storage/generated/";

  this.generate = function(collection){
    return Compositions.generate({id: collection._id.$oid}, {}).$promise
      .then(this.loaded.bind(this));
  };

  this.loadFromURL = function() {
    var path = $location.path().split('/');
    var obj;
    if (path.length > 1 && path[1].length > 5) {
      obj = {_id: {"$oid": path[1]}};
    }
    return this.loaded(obj);
  };

  this.loaded = function(obj) {
    if (obj === undefined) {
      return {$loaded: false};
    } else {
      // obj.id = obj._id.$oid;
      // obj.filename = baseURL + obj.filename;
      // obj.url = hostURL + "/" + obj.id;
      obj.$loaded = true;
      return obj;
    }
  };
}


/* @ngInject */
function User($cookies, $q, Users){

  this.user = undefined;

  this.getUser = function() {
    if (this.user === undefined) {

      var user_id = $cookies.bquser;

      if (user_id === undefined) {
        this.user = Users.save({}, function(res) {
          $cookies.bquser = res._id.$oid;
        });
      } else {
        this.user = Users.get({id: user_id});
      }
    }

    return this.user.$promise;
  };
}

})();
