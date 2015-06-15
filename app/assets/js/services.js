define([
    'app'
], function(bq) {

  bq.service("CollectionService", ["$q", "$http", "UserService", "User", "Collection", function($q, $http, UserService, User, Collection) {

    this.create = function() {
      return UserService.getUser().then(function(user){
        return User.newCollection({id: user._id.$oid}, {}).$promise;
      });
    };

    this.upload = function(files, collection) {

        console.log(collection);
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
      return Collection.newSubset({id: collection._id.$oid}, {}).$promise;
    };

  }]);


  bq.service("MosaicService", ["Subset", "$location", function(Subset, $location) {

    var hostURL = $location.protocol() + "://" + $location.host();
    if ($location.port() !== 80) hostURL += ":" + $location.port();
    baseURL = hostURL + "/storage/generated/";

    this.generate = function(subset){
      return Subset.generateMosaic({id: subset._id.$oid}, {}).$promise
        .then(this.loaded.bind(this));
    };

    this.loadFromURL = function() {
      var path = $location.path().split('/');
      var obj;
      if (path.length > 1 && path[1].length > 5) {
        obj = {_id: {"$oid": path[1]}, filename: path[1]+".jpg", thumbnail: path[1]+"_display.jpg"};
      }
      return this.loaded(obj);
    };

    this.loaded = function(obj) {
      if (obj === undefined) {
        return {$loaded: false};
      } else {
        obj.id = obj._id.$oid;
        obj.filename = baseURL + obj.filename;
        obj.thumbnail = baseURL + obj.thumbnail;
        obj.url = hostURL + "/" + obj.id;
        obj.$loaded = true;
        return obj;
      }
    };
  }]);


  bq.service("UserService", ["$cookies", "$q", "User", function($cookies, $q, User){

    this.user = undefined;

    this.getUser = function() {
      if (this.user === undefined) {

        var user_id = $cookies.bquser;

        if (user_id === undefined) {
          this.user = User.save({}, function(res) {
            $cookies.bquser = res._id.$oid;
          });
        } else {
          this.user = User.get({id: user_id});
        }

      }

      return this.user.$promise;
    };

  }]);

});
