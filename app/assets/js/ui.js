(function(){
  'use strict';

angular.module("ui")
  .directive("uiInterface", uiInterface)
  .directive("uiUpload", uiUpload)
  .directive("uiComposition", uiComposition)
  .directive("uiTile", uiTile);


/* @ngInject */
function uiInterface(Collection, Composition, User){
  return {
    controller: InterfaceController
  };

  function InterfaceController($scope) {

    this.upload = upload;
    $scope.reset = init;
    $scope.shuffle = shuffle;
    $scope.isEmpty = isEmpty;

    function init() {
      $scope.state = 0;
      $scope.user = {};
      $scope.collection = {};
      $scope.composition = {};
    }

    function uploadCollection(files) {
      if ($scope.collection.photos === undefined) {
        $scope.state = 1;
        return User.newCollection().then(function(col) {
          $scope.collection = col;
          return Collection.upload(files, col);
        });
      } else {
        $scope.state = 5;
        return Collection.upload(files, $scope.collection);
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
      return User.getUser().then(function(user){
        $scope.user = user;
      });
    }

    function upload(files) {
      return uploadCollection(files)
        .then(generateComposition)
        .then(displayComposition)
        .then(updateUser);
    }

    function shuffle() {
      generateComposition($scope.collection)
        .then(displayComposition);
    }

    init();
  }
}

function uiUpload(){
  return {
    require: "^uiInterface",
    link: UploadLink
  };

  function UploadLink($scope, $element, $attr, uictrl) {
      var fileupload = angular.element(document.getElementById("file-upload"));

      $scope.triggerUpload = function(ev) {
        fileupload.trigger("click");
      };

      fileupload.on("change", function(ev) {
        ev.preventDefault();
        if (!$scope.collection.$loading) {
          uictrl.upload(ev.target.files);
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
        uictrl.upload(ev.dataTransfer.files);
      });
    }
}

function uiComposition(){
  return {
    require: "^uiInterface",
    controller: Controller,
    link: Link
  };

  function Controller($scope, $element) {
    $scope.composition = testData;
    $scope.state = 3;

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

    function isOutOfBounds(position, bounds) {
      return position[0] < bounds[0] || position[1] < bounds[1] || position[0] > bounds[2] || position[1] > bounds[3];
    }

    $scope.moveTiles = function(targets, orientation, bounds, dx, dy) {
      var tile_tl = targets.topleft.map(function(idx){ return $scope.composition.tiles[idx]; });
      var tile_br = targets.bottomright.map(function(idx){ return $scope.composition.tiles[idx]; });

      var newcoord_tl = tile_tl.map(function(tile){
        return [
          tile.tx1 + dx * orientation[0],
          tile.ty1 + dy * orientation[1]
        ];
      });

      var newcoord_br = tile_br.map(function(tile) {
        return [
          tile.tx2 + dx * orientation[0],
          tile.ty2 + dy * orientation[1]
        ];
      });

      var is_out = newcoord_tl.concat(newcoord_br).map(function(coord){
        return isOutOfBounds(coord, bounds);
      }).reduce(function(res, current) {
        return res || current;
      });

      if (!is_out) {
        tile_tl.forEach(function(tile, i){
          tile.tx1 = newcoord_tl[i][0];
          tile.ty1 = newcoord_tl[i][1];
          centerTile(tile);
        });
        tile_br.forEach(function(tile, i){
          tile.tx2 = newcoord_br[i][0];
          tile.ty2 = newcoord_br[i][1];
          centerTile(tile);
        });
      }
    };
  }

  function Link($scope, $element) {
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

    function findBounds(tl, br, orientation) {
      var tl_tiles = tl.map(function(i){ return $scope.composition.tiles[i]; });
      var br_tiles = br.map(function(i){ return $scope.composition.tiles[i]; });

      var m = 0.05;
      return [
        (br_tiles.map(function(tile){ return tile.tx1; }).sort(compare_max)[0] + m) * orientation[0],
        (br_tiles.map(function(tile){ return tile.ty1; }).sort(compare_max)[0] + m) * orientation[1],
        Math.max((tl_tiles.map(function(tile){ return tile.tx2; }).sort(compare_min)[0] - m), 1-orientation[0]),
        Math.max((tl_tiles.map(function(tile){ return tile.ty2; }).sort(compare_min)[0] - m), 1-orientation[1])
      ];
    }


    $element.on("mousedown", function(ev){
      ev.stopPropagation();
      ev.preventDefault();
      var targets = findTargets(ev.offsetX/$element.width(), ev.offsetY/$element.height());
      var orientation = findOrientation(targets.topleft, targets.bottomright);
      var bounds = findBounds(targets.topleft, targets.bottomright, orientation);

      $element.on("mousemove", function(moveev){
        moveev.stopPropagation();
        moveev.preventDefault();
        var dx = moveev.originalEvent.movementX / $element.width();
        var dy = moveev.originalEvent.movementY / $element.height();
        $scope.moveTiles(targets, orientation, bounds, dx, dy);
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
}


function uiTile(){
  return {
    require: '^^uiComposition',
    controller: Controller,
    link: Link
  };

  function Controller($scope) {
    $scope.filename = function(path) {
      return path.split('/').pop();
    };
  }

  function Link($scope, $element, $attr, $ctrl) {
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
}

})();
