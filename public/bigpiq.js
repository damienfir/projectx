'use strict';

var app = angular.module("ui", [
    'ngResource',
    'ngCookies'
]);


var valid_formats = ['image/jpeg', 'image/png'];

function validateFileType(file) {
  return valid_formats.indexOf(file.type) != -1;
}

function getValidFiles(files) {
  var valid_files = [];
  for (var i = 0; i < files.length; i++) {
    if(validateFileType(files[i])) valid_files.push(files[i]);
  }
  return valid_files;
}


app.directive("uiInterface", ["Collection", "Composition", "User", function(Collection, Composition, User){
  return {
    controller: function($scope) {

      function init() {
        $scope.state = 0;
        $scope.user = {};
        $scope.collection = {};
        $scope.composition = {};
      }

      function uploadCollection(files) {
        var valid_files = getValidFiles(files);

        if ($scope.collection.photos === undefined) {
          $scope.state = 1;
          var collection = Collection.create();
          updateUser();
          return collection.then(function(col) {
            $scope.collection = angular.extend(col, $scope.collection);
            return Collection.upload(valid_files, col);
          });
        } else {
          $scope.state = 5;
          return Collection.upload(valid_files, $scope.collection);
        }
      }

      function generateComposition(collection) {
        $scope.state = 2;
        return Composition.generate(collection);
      }

      function displayComposition(composition) {
        $scope.state = 3;
        $scope.composition = composition;
      }

      function updateUser() {
        User.getUser().then(function(user){
          $scope.user = user;
        });
      }

      this.upload = function(files) {
        return uploadCollection(files)
          .then(generateComposition)
          .then(displayComposition);
      };

      $scope.shuffle = function() {
        generateComposition($scope.collection)
          .then(displayComposition);
      };

      $scope.reset = init;
      $scope.isEmpty = function(obj) { for (var p in obj) {return false;} return true; };

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
    require: "^uiInterface",
    controller: function($scope, $element) {
      // $scope.composition = testData;
      // $scope.state = 3;

      this.moving = function(idx) {
        $scope.currently_moving = idx;
      };

      this.swapped = function(idx) {
        $scope.last_swapped = idx;
      };

      function centerTile(tile) {
        var ar = (tile.tx2-tile.tx1)/(tile.ty2-tile.ty1);
        var center = [tile.cx1+(tile.cx2-tile.cx1)/2, tile.cy1+(tile.cy2-tile.cy1)/2];
        tile.cx1 = 0;
        tile.cy1 = 0;
        if (ar > 1) {
          tile.cx2 = 1;
          tile.cy2 = 1/ar;
          var dy = tile.cy2/2 - center[1];
          tile.cy1 = Math.max(0,tile.cy1-dy);
          tile.cy2 = Math.min(1,tile.cy2-dy);
        } else {
          tile.cx2 = 1*ar;
          tile.cy2 = 1;
          var dx = tile.cx2/2 - center[0];
          tile.cx1 = Math.max(0,tile.cx1-dx);
          tile.cx2 = Math.min(1,tile.cx2-dx);
        }
      }

      this.swap = function(idx1, idx2) {
        var tile1 = $scope.composition.tiles[idx1];
        var tile2 = $scope.composition.tiles[idx2];
        var tmp = angular.copy(tile1);

        tile1.tx1 = tile2.tx1;
        tile1.ty1 = tile2.ty1;
        tile1.tx2 = tile2.tx2;
        tile1.ty2 = tile2.ty2;

        tile2.tx1 = tmp.tx1;
        tile2.ty1 = tmp.ty1;
        tile2.tx2 = tmp.tx2;
        tile2.ty2 = tmp.ty2;

        centerTile(tile1);
        centerTile(tile2);

        $scope.$digest();
      };

      $scope.moveTiles = function(targets, orientation, dx, dy) {
          var i;

          targets.topleft.forEach(function(idx){
            var tile = $scope.composition.tiles[idx];
            tile.tx1 += dx * orientation[0];
            tile.ty1 += dy * orientation[1];
            centerTile(tile);
          });

          targets.bottomright.forEach(function(idx) {
            var tile = $scope.composition.tiles[idx];
            tile.tx2 += dx * orientation[0];
            tile.ty2 += dy * orientation[1];
            centerTile(tile);
          });
      };
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
        if (Math.min(tl.length, br.length) === 0) return [0,0];
        if (tl.length === br.length && tl.length === 1) {
          var tile_tl = $scope.composition.tiles[tl[0]];
          var tile_br = $scope.composition.tiles[br[0]];
          return (Math.abs(tile_tl.ty1-tile_br.ty2) < Math.abs(tile_tl.tx1-tile_br.tx2)) ? [0,1] : [1,0];
        }

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

      $element.on("mousedown", function(ev){
        ev.stopPropagation();
        ev.preventDefault();
        var targets = findTargets(ev.offsetX/$element.width(), ev.offsetY/$element.height());
        var orientation = findOrientation(targets.topleft, targets.bottomright);

        $element.on("mousemove", function(moveev){
          moveev.stopPropagation();
          moveev.preventDefault();
          var dx = moveev.originalEvent.movementX / $element.width();
          var dy = moveev.originalEvent.movementY / $element.height();

          $scope.moveTiles(targets, orientation, dx, dy);

          $scope.$digest();
        });
      });

      $element.on("mouseup", function() {
        $element.off("mousemove");
      });

      $element.on("mouseleave", function(){
        $scope.$broadcast("stopmoving");
        $scope.last_swapped = undefined;
      });
    }
  };
}]);


app.directive('uiTile', [function(){
  return {
    require: '^^uiComposition',
    controller: function($scope) {
      $scope.filename = function(path) {
        return path.split('/').pop();
      };
    },
    link: function($scope, $element, $attr, $ctrl) {
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

      function stopMoving() {
        $element.off("mousemove");
        $ctrl.moving(undefined);
      }

      $scope.$watchCollection("tile", render);

      $element.on("mousedown", function(downev){
        downev.stopPropagation();
        downev.preventDefault();

        $ctrl.moving($scope.$index);

        $element.on("mousemove", function(ev){
          ev.stopPropagation();
          ev.preventDefault();
          move(ev.originalEvent.movementY / img.height, 'cy1', 'cy2');
          move(ev.originalEvent.movementX / img.width, 'cx1', 'cx2');
          $scope.$digest();
        });
      });

      $scope.$on("stopmoving", function(){ stopMoving(); });

      $element.on("mouseup", function(){
        if ($scope.currently_moving === $scope.$index) {
          stopMoving();
        }
        $ctrl.swapped(undefined);
      });

      $element.on("mouseenter", function(ev) {
        if (!angular.isUndefined($scope.currently_moving) && $scope.currently_moving !== $scope.$index) {
          $ctrl.swap($scope.currently_moving, $scope.$index);
          if (!angular.isUndefined($scope.last_swapped)) {
            $ctrl.swap($scope.$index, $scope.last_swapped);
          }
          $ctrl.swapped($scope.$index);
        }
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

app.directive("bqShare", ["$window", function($window) {
  return {
    controller: function($scope) {

      var facebookID = "1580376645513631";

      function shareURL(url) {
        $window.open(url, 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600');
      }

      $scope.shareFacebook = function() {
        console.log("fb");
        var url = $scope.mosaic.url;
        analytics.share("facebook", url);
        shareURL("http://www.facebook.com/dialog/share?app_id="+facebookID+"&display=popup&href="+encodeURIComponent(url)+"&redirect_uri="+encodeURIComponent(url));
      };

      $scope.shareGoogle = function() {
        var url = $scope.mosaic.url;
        // ga("send", "social", "google", "share", url);
        // ga("send", "event", "share", "google");
        shareURL("https://plus.google.com/share?url=" + encodeURIComponent(url));
      };

      $scope.sharePinterest = function() {
        var url = $scope.mosaic.url;
        // ga("send", "social", "pinterest", "share", url);
        // ga("send", "event", "share", "pinterest");
        shareURL("https://www.pinterest.com/pin/create/button/?url="+encodeURIComponent(url)+"&media="+encodeURIComponent($scope.mosaic.thumbnail)+"&description=");
      };

      $scope.shareTwitter = function() {
        var url = $scope.mosaic.url;
        // ga("send", "social", "twitter", "share", url);
        // ga("send", "event", "share", "twitter");
        shareURL("https://twitter.com/intent/tweet?url="+encodeURIComponent(url));
      };
    },
    link: function($scope, $element) {
      $element.children(".modal-body button").tooltip();
    }
  };
}]);

app.directive("bqSend", ["$http", "$window", function($http, $window) {
  return {
    controller: function($scope) {
      function reset(){
        $scope.sent = false;
      }

      $scope.sendTo = function() {
        $http.post("/mosaics/generate", $scope.composition).then(function() {
          $http.post("/users/"+$scope.user._id.$oid+"/send/"+$scope.mosaic.id, {
            to: $scope.to,
            from: $scope.from,
            composition: $scope.composition
          }).then(function(){
            $scope.sent = true;
            $window.setTimeout(reset, 2000);
          });
        });
      };
    }
  };
}]);

app.directive("bqDownload", ["$http", "$window", function($http, $window){
  return {
    controller: function($scope) {
      $scope.download = function() {
        $http.post("/mosaics/generate", $scope.composition).then(function() {
          $window.location.href = "/users/"+$scope.user._id.$oid+"/download/"+$scope.composition._id.$oid+"?email="+encodeURIComponent($scope.email);
        });
      };
    },
    link: function($scope, $element) {
      var emailRegex = /[^@]+@[^\.]+\..+/;
      var form = angular.element(document.getElementById("download-form"));
      var download = angular.element(document.getElementById("download-btn"));
      angular.element(document.getElementById("email-input")).on("input", function(ev){
        download.attr("disabled", !emailRegex.test(ev.target.value));
      });

      // form.on("submit", function() {
      //   form.
      // })
    }
  };
}]);

app.directive("bqForm", ["$http", function($http){
  return {
    restrict: "A",
    link: function($scope, $element, $attr) {
      $element.on("submit", function(ev) {
        ev.preventDefault();
        $http({
          method: "POST",
          url: $attr.bqForm,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data: $element.serialize()
        })
        .success(function(data, status){
          $scope.httpStatus = status;
        })
        .error(function(data, status){
          $scope.httpStatus = status;
        });
      });
    }
  };
}]);


app.directive("bqFeedback", ["$http", function($http){
  return {
    controller: function($scope, $element) {
      this.pullUp = function() {
        $element.css("bottom", "-10px");
        analytics.event("feedback", "opened-panel");
      };

      this.pullDown = function() {
        $element.css("bottom", "-"+($element.height()-35)+"px");
        analytics.event("feedback", "closed-panel");
      };

      this.getQuestions = function() {
        $http.get("/questions").success(function(data){
          $scope.questions = data;
          $scope.nextQuestion();
        });
      };
    },
    link: function($scope, $element, $attr, ctrl) {
      $scope.choose = function(question_id, choice_id) {
        $http.post("/feedback", {
          "user_id": $scope.user._id.$oid,
          "question_id": question_id,
          "choice": choice_id
        }).success(function(){
          $scope.nextQuestion();
        });
        // ga("send", "event", "feedback", "answered-question");
      };

      $scope.submitText = function() {
        ctrl.pullDown();
      };

      $scope.nextQuestion = function() {
        $scope.question = $scope.questions.length ? $scope.questions.shift() : {};
      };


      ctrl.getQuestions();

      $element.on("mouseenter", ctrl.pullUp.bind(ctrl));
      $element.on("mouseleave", ctrl.pullDown.bind(ctrl));
    }
  };
}]);

var testData = {
  _id: {$oid: "abcde"},
  collection: {$oid: "colid"},
  photos: [
    "600ffa1c5cf83522749150b6e3470d2561237ed3",
    "1ac273e4a270025a07d5c2032bd0a2e0d4bfc270",
    "5d1425eec2982f85769671719ef5cc2ec08fc5de",
    "394b0676e46217e277b53c80d090f93251a5d41d",
    "cffe801018262d2ce7e1481fdfa3c16b5d19f47b",
    "1f7083f16c13caf4ae5356d66e957600e02281c3",
    "90c2082d6b5b8316ecbcb32080a877c04b63d437"
  ],
  tiles: [
  {
    "tileindex": 0,
    "cx1": 0.16981132075471697,
    "ty2": 0.51657458563535907,
    "imgindex": 6,
    "cy2": 1.0,
    "ty1": 0.0055248618784530384,
    "cy1": 0.0,
    "tx1": 0.681640625,
    "tx2": 0.99609375,
    "cx2": 0.74916759156492785
  },
  {
    "tileindex": 1,
    "cx1": 0.2297447280799112,
    "ty2": 0.73618784530386738,
    "imgindex": 5,
    "cy2": 1.0,
    "ty1": 0.25690607734806631,
    "cy1": 0.0,
    "tx1": 0.4306640625,
    "tx2": 0.677734375,
    "cx2": 0.71476137624861269
  },
  {
    "tileindex": 2,
    "cx1": 0.0,
    "ty2": 0.99447513812154698,
    "imgindex": 1,
    "cy2": 0.69333333333333336,
    "ty1": 0.74171270718232041,
    "cy1": 0.42333333333333334,
    "tx1": 0.00390625,
    "tx2": 0.99609375,
    "cx2": 1.0
  },
  {
    "tileindex": 3,
    "cx1": 0.0,
    "ty2": 0.25138121546961328,
    "imgindex": 0,
    "cy2": 0.78666666666666663,
    "ty1": 0.0055248618784530384,
    "cy1": 0.40000000000000002,
    "tx1": 0.00390625,
    "tx2": 0.677734375,
    "cx2": 1.0
  },
  {
    "tileindex": 4,
    "cx1": 0.0,
    "ty2": 0.51657458563535907,
    "imgindex": 3,
    "cy2": 0.90166666666666662,
    "ty1": 0.25690607734806631,
    "cy1": 0.25,
    "tx1": 0.00390625,
    "tx2": 0.4267578125,
    "cx2": 1.0
  },
  {
    "tileindex": 5,
    "cx1": 0.0,
    "ty2": 0.73618784530386738,
    "imgindex": 2,
    "cy2": 0.98499999999999999,
    "ty1": 0.52209944751381221,
    "cy1": 0.44666666666666666,
    "tx1": 0.00390625,
    "tx2": 0.4267578125,
    "cx2": 1.0
  },
  {
    "tileindex": 6,
    "cx1": 0.0,
    "ty2": 0.73618784530386738,
    "imgindex": 4,
    "cy2": 0.94333333333333336,
    "ty1": 0.52209944751381221,
    "cy1": 0.22,
    "tx1": 0.681640625,
    "tx2": 0.99609375,
    "cx2": 1.0
  }
  ]
};
