define([
    "angular",
    "angular-resource",
    "angular-cookies"
], function(angular, angularResource, angularCookies){

  var bq = angular.module("bq", ["ngResource", "ngCookies"]);

  bq.factory("User", ["$resource", function($resource){
    return $resource("/users/:id", {}, {
      "newCollection": {url: "/users/:id/collections", method: "POST"}
    });
  }]);


  bq.factory("Collection", ["$resource", function($resource){
    return $resource("/collections/:id", {}, {
      addPhoto: {url: "/collections/:id/photos", method: "POST"},
      generateMosaic: {url: "/collections/:id/mosaics", method: "POST"}
    });
  }]);


  bq.directive("bqCollection", ["$q", function($q){
    return {
      controller: function($scope) {
        var box = document.getElementById("photos-collection");
        this.photos = [];
        var ratio = 1.41;
        var min_columns = 3;
        var max_rows = 10;

        this.reset = function(length) {
          var col = Math.max(min_columns, Math.floor( 0.7 * Math.sqrt(length)));
          this.width = 100 / col;
          var height = ((box.offsetWidth / col) / ratio) * Math.ceil(length / col);
          box.style.height = height+"px";
          while(box.firstChild) { box.removeChild(box.firstChild); }
          this.photos = [];
        };

        this.addPhotos = function(urls) {
          var self = this;

          return $q(function(resolve) {
            urls.forEach(function(url, i, array) {
              setTimeout(function() {
                self.addPhoto(url);
                if (i == array.length-1) resolve();
              }, i*100);
              i++;
            });
          });
        };

        this.addPhoto = function(url) {
          var img = document.createElement("img");
          img.style.backgroundImage = "url("+url+")";
          img.style.width = this.width+"%";
          img.style.paddingBottom = (this.width/ratio)+"%";
          box.appendChild(img);
          // img.classList.add("photo-muted");
          setTimeout(function(){
            img.style.opacity = 0.3;
          }, 0);
          this.photos.push(img);
        };

        this.selectPhotos = function(indices) {
          indices = indices || this.photos.map(function(_,i){ return i; });
          // console.log(indices);

          var self = this;
          return $q(function(resolve) {
            indices.forEach(function(index, i, array) {
              setTimeout(function(){
                self.selectPhoto(index);
                if (i == array.length-1) resolve();
              }, index*100);
            });
          });
        };

        this.selectPhoto = function(index) {
          var img = this.photos[index].style.opacity = 1;
        };
      },

      link: function($scope, $element, $attr, ctrl) {
        $scope.$on("uploading", function(ev, length){
          ctrl.reset(length);
        });

        $scope.$on("uploaded", function(ev, files) {
          ctrl.addPhotos(files.filenames);
        });

        $scope.$on("processing", function(ev) {
          ctrl.selectPhotos();
        });
      }
    };
  }]);

  bq.directive("bqMosaic", function() {
    return {
      controller: function($scope) {
        // change image
      }
    };
  });


  bq.directive("bqDropzone", function(){
    return {
      link: function(scope, element, attr) {
      
      }
    };
  });


  bq.service("UploadService", ["$q", "$http", "$rootScope", "UserService", "CollectionService", "Collection", "MosaicService", function($q, $http, $rootScope, UserService, CollectionService, Collection, MosaicService) {

    this.upload = function(files) {
      $rootScope.$broadcast("uploading", files.length);

      return UserService.getUser().then(function(user){
        return user.$newCollection({id: user._id.$oid});
      })
      .then(function(collection){
        var defer = $q.defer();

        function chainUpload(index) {
          if (files.length > index) {
            var fd = new FormData();
            fd.append("image", files[index]);
            $http.post("/collections/"+collection._id.$oid+"/photos", fd, {
              transformRequest: angular.identity,
              headers: {'Content-Type': undefined}
            }).then(
              function(res){
                defer.notify(res.data);
                chainUpload(index+1);
              }, defer.reject.bind(defer),
              function(progress) {
                $rootScope.$broadcast("progress", progress, index);
              });
          } else {
            defer.resolve(collection);
          }
        }

        chainUpload(0);

        return defer.promise.then(function(collection) {
          $rootScope.$broadcast("processing");
          return MosaicService.process(collection);
        }, function(reason) {
          $rootScope.$broadcast("upload-failed", reason);
        }, function(uploaded) {
          $rootScope.$broadcast("uploaded", uploaded);
        })
        .then(function(obj) {
          $rootScope.$broadcast("processed", obj);
        }, function(reason) {
          $rootScope.$broadcast("processing-failed", reason);
        });
      });
    };

  }]);


  bq.service("MosaicService", ["Collection", function(Collection) {

    this.process = function(collection){
      return Collection.generateMosaic({id: collection._id.$oid}, {}).$promise;
    };

  }]);


  bq.service("UserService", ["$cookies", "$q", "User", function($cookies, $q, User){

    this.user = undefined;

    this.getUser = function() {
      if (this.user === undefined) {
        this.user = User.save({});
        return this.user.$promise;
        // get from cookie
      } else {
        return $q(this.user);
      }
    };

  }]);


  bq.service("CollectionService", ["Collection", function(Collection){
    this.collection = undefined;
    this.photos = [];

    this.getCollection = function(user) {
    };

    this.newCollection = function(user) {
    };
  }]);


  bq.controller("InterfaceController", ["$scope", function($scope){
  }]);

  bq.controller("UploadController", ["$scope", "$rootScope", "UploadService", function($scope, $rootScope, UploadService){
    var fileupload = document.getElementById("file-upload");

    $scope.triggerUpload = function(ev) {
      fileupload.dispatchEvent(new MouseEvent("click"));
    };

    this.upload = function(ev) {
      ev.preventDefault();
      UploadService.upload(ev.target.files);
    };

    fileupload.addEventListener("change", this.upload.bind(this));
  }]);

  var $html = angular.element(document.getElementsByTagName('html')[0]);
  angular.element().ready(function() {
    angular.bootstrap(document, ['bq']);
  });
});
