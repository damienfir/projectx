require(['config'], function(){
require([
  'angular',
  'angular-cookies',
  'angular-resource',
  'test-data',
  // 'angular-animate'
], function(angular, cookies, resource, testData){

  var app = angular.module("ui", [
      'ngResource',
      'ngCookies'
  ]);


  var valid_formats = ['image/jpeg', 'image/png'];

  app.directive("uiInterface", ["Collection", "Composition", "User", function(Collection, Composition, User){
    return {
      controller: function($scope) {

        function init() {
          $scope.collection = {$loaded: false, $loading: false, thumbs: []};
          $scope.mosaic = {$processed: false, $loaded: false, $shuffling: false, $processing: false};
          $scope.user = {_id: {$oid: ""}};
        }

        function validateFileType(file) {
          return valid_formats.indexOf(file.type) != -1;
        }

        function uploadCollection(files) {
          var valid_files = [];
          for (var i = 0; i < files.length; i++) {
            if(validateFileType(files[i])) valid_files.push(files[i]);
          }

          if (!$scope.collection.$loaded) {
            var collection = Collection.create();
            updateUser();
            return collection.then(function(col) {
              $scope.collection = angular.extend(col, $scope.collection);
              return Collection.upload(valid_files, col);
            });
          } else {
            return Collection.upload(valid_files, $scope.collection);
          }
        }

        this.upload = function(files) {
          $scope.collection.$loaded = false;
          $scope.collection.$loading = true;
          $scope.collection.size = files.length;

          return uploadCollection(files)
            .then(
              generateMosaic,
              undefined,
              addToCollection
            )
            .then(displayMosaic);
        };

        function addToCollection(uploaded) {
          $scope.collection.thumbs = $scope.collection.thumbs.concat(uploaded.filenames.map(function(x){
            return {src: x, selected: false};
          }));
        }

        function generateMosaic(collection) {
          return Composition.generate(collection);
        }

        function displayMosaic(mosaic) {
          $scope.mosaic = angular.extend(mosaic, {
            $processed: true,
            $processing: false
          });
        }

        function updateUser() {
          User.getUser().then(function(user){
            $scope.user = user;
          });
        }

        $scope.shuffle = function() {
          $scope.mosaic.$shuffling = true;
          generateMosaic($scope.subset).then(displayMosaic).then(function(){
            $scope.mosaic.$shuffling = false;
          });
        };

        $scope.reset = init;

        init();
      }
    };
  }]);

  app.directive("uiUpload", [function(){
    return {
      require: "^uiInterface",
      link: function($scope, $element, $attr, ctrl) {
        var fileupload = angular.element(document.getElementById("file-upload"));

        $scope.triggerUpload = function(ev) {
          fileupload.trigger("click");
        };

        fileupload.on("change", function(ev) {
          ev.preventDefault();
          if (!$scope.collection.$loading) {
            ctrl.upload(ev.target.files);
          }
        });

        var dropzone = document.getElementById("dropzone");
        dropzone.addEventListener("dragover", function(ev){
          ev.stopPropagation();
          ev.preventDefault();
          ev.dataTransfer.dropEffect = 'copy';
        });

        dropzone.addEventListener("drop", function(ev){
          ev.stopPropagation();
          ev.preventDefault();
          ctrl.upload(ev.dataTransfer.files);
        });
      }
    };
  }]);

  app.directive('uiComposition', [function(){
    return {
      controller: function($scope, $element) {
        var el = $element[0];
        $scope.composition = testData;
      },
      link: function($scope, $element) {

        function getOrientation(tiles, prop) {
          return tiles.map(function(idx) {
            return $scope.composition.tiles[idx][prop];
          }).reduce(function(prev, curr) {
            return (prev === curr) ? prev : false;
          }) ? [1,0] : [0,1];
        }

        function findOrientation(tl, br) {
          if (tl.length >= br.length) {
            return getOrientation(tl, 'tx1');
          } else {
            return getOrientation(br, 'tx2');
          }
        }

        function findTargets(xn, yn) {
          var tl_targets = [];
          var br_targets = [];
          var tiles = $scope.composition.tiles;
          var best1 = Infinity,
              best2 = Infinity;

          for (var i = 0; i < tiles.length; i++) {
            var dy1 = Math.abs(yn - tiles[i].ty1);
            var dx1 = Math.abs(xn - tiles[i].tx1);
            var dy2 = Math.abs(yn - tiles[i].ty2);
            var dx2 = Math.abs(xn - tiles[i].tx2);
            var min1 = Math.min(dy1, dx1);
            var min2 = Math.min(dy2, dx2);

            if (min1 < min2) {
              if (min1 < best1) {
                tl_targets = [];
                best1 = min1;
              }
              if (min1 == best1) {
                tl_targets.push(i);
              }
            } else {
              if (min2 < best2) {
                br_targets = [];
                best2 = min2;
              }
              if (min2 == best2) {
                br_targets.push(i);
              }
            }
          }

          return {
            'topleft': tl_targets,
            'bottomright': br_targets,
          };
        }

        // $element.on("mousedown", function(ev){
        //   // console.log(ev);
        //   ev.stopPropagation();
        //   ev.preventDefault();
        //   var targets = findTargets(ev.offsetX/$element.width(), ev.offsetY/$element.height());
        //   var orientation = findOrientation(targets.topleft, targets.bottomright);

        //   $element.on("mousemove", function(moveev){
        //     moveev.stopPropagation();
        //     moveev.preventDefault();
        //     var dx = moveev.originalEvent.movementX / $element.width();
        //     var dy = moveev.originalEvent.movementY / $element.height();
        //     var i;

        //     targets.topleft.forEach(function(idx){
        //       $scope.composition.tiles[idx].tx1 += dx * orientation[0];
        //       $scope.composition.tiles[idx].ty1 += dy * orientation[1];
        //     });

        //     targets.bottomright.forEach(function(idx) {
        //       $scope.composition.tiles[idx].tx2 += dx * orientation[0];
        //       $scope.composition.tiles[idx].ty2 += dy * orientation[1];
        //     });

        //     $scope.$digest();
        //   });
        // });

        // $element.on("mouseup", function() {
        //   $element.off("mousemove");
        // });
      }
    };
  }]);

  app.directive('uiTile', [function(){
    return {
      require: '^^uiComposition',
      link: function($scope, $element) {
        var tile = $element[0];
        var img = $element.children()[0];

        function percent(x) { return x * 100 + "%"; }

        function render() {
          var scaleX = 1 / ($scope.tile.cx2 - $scope.tile.cx1);
          var scaleY = 1 / ($scope.tile.cy2 - $scope.tile.cy1);

          tile.style.height = percent($scope.tile.ty2 - $scope.tile.ty1);
          tile.style.width = percent($scope.tile.tx2 - $scope.tile.tx1);
          tile.style.top = percent($scope.tile.ty1);
          tile.style.left = percent($scope.tile.tx1);
          img.style.width = percent(scaleX);
          img.style.height = percent(scaleY);
          img.style.top = percent(- $scope.tile.cy1 * scaleY);
          img.style.left = percent(- $scope.tile.cx1 * scaleX);
        }

        $scope.$watchCollection("tile", render);

        function move(offset, prop1, prop2) {
          var loc = $scope.tile[prop1];
          var original_size = $scope.tile[prop2] - $scope.tile[prop1];
          $scope.tile[prop1] = Math.max(0, $scope.tile[prop1] - offset);
          $scope.tile[prop2] = $scope.tile[prop1] + original_size;
          if ($scope.tile[prop2] > 1) {
            $scope.tile[prop1] = loc;
            $scope.tile[prop2] = loc + original_size;
            return false;
          }
          return true;
        }

        $element.on("mousedown", function(downev){
          downev.stopPropagation();
          downev.preventDefault();

          $element.on("mousemove", function(ev){
            ev.stopPropagation();
            ev.preventDefault();

            move(ev.originalEvent.movementY / img.offsetHeight, 'cy1', 'cy2');
            move(ev.originalEvent.movementX / img.offsetWidth, 'cx1', 'cx2');

            $scope.$digest();
          });
        });

        $element.on("mouseup mouseleave", function(){
          $element.off("mousemove");
        });
      }
    };
  }]);


  app.service("Collection", ["$q", "$http", "User", "Users", "Collections", function($q, $http, User, Users, Collections) {

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

  }]);


  app.service("Composition", ["Compositions", "$location", function(Compositions, $location) {

    var hostURL = $location.protocol() + "://" + $location.host();
    if ($location.port() !== 80) hostURL += ":" + $location.port();
    baseURL = hostURL + "/storage/generated/";

    this.generate = function(collection){
      return Compositions.generate({id: collection._id.$oid}, {}).$promise
        .then(this.loaded.bind(this));
    };

    this.loadFromURL = function() {
      var path = $location.path().split('/');
      var obj;
      if (path.length > 1 && path[1].length > 5) {
        obj = {_id: {"$oid": path[1]}};//, filename: path[1]+".jpg"};
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
  }]);


  app.service("User", ["$cookies", "$q", "Users", function($cookies, $q, Users){

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
  }]);


  app.factory("Users", ["$resource", function($resource){
    return $resource("/users/:id", {}, {
      newCollection: {url: "/users/:id/collections", method: "POST"}
    });
  }]);


  app.factory("Collections", ["$resource", function($resource){
    return $resource("/collections/:id", {}, {
      addPhoto: {url: "/collections/:id/photos", method: "POST"},
    });
  }]);

  app.factory("Compositions", ["$resource", function($resource){
    return $resource("/mosaics/:id", {}, {
      generate: {url: "/collections/:id/mosaics", method: "POST"}
    });
  }]);

  angular.element().ready(function() {
    angular.bootstrap(document, ['ui']);
  });

});
});
