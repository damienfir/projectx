require(['config'], function(){
require([
  'angular',
  'test-data',
  // 'angular-resource',
  // 'angular-animate'
], function(angular, testData){

  
  var app = angular.module("ui", []);

  app.directive("uiInterface", ["CollectionService", "MosaicService", "UserService", function(CollectionService, MosaicService, UserService){
    return {
      controller: function($scope) {

        function init() {
          $scope.collection = {$loaded: false, $loading: false, thumbs: []};
          $scope.mosaic = {$processed: false, $loaded: false, $shuffling: false, $processing: false, filename: '/assets/stock/people/mosaic.jpg'};
          $scope.subset = {};
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
          console.log(valid_files);

          if (!$scope.collection.$loaded) {
            var collection = CollectionService.create();
            updateUser();
            return collection.then(function(col) {
              $scope.collection = angular.extend(col, $scope.collection);
              return CollectionService.upload(valid_files, col);
            });
          } else {
            return CollectionService.upload(valid_files, $scope.collection);
          }
        }

        this.upload = function(files) {
          $scope.collection.$loaded = false;
          $scope.collection.$loading = true;
          $scope.collection.size = files.length;

          return uploadCollection(files)
            .then(
              newSubset,
              undefined,
              addToCollection
            )
            .then(generateMosaic)
            .then(displayMosaic);
        };

        function addToCollection(uploaded) {
          $scope.collection.thumbs = $scope.collection.thumbs.concat(uploaded.filenames.map(function(x){
            return {src: x, selected: false};
          }));
        }

        function newSubset(collection) {
          $scope.mosaic.$processing = true;
          $scope.collection = angular.extend(collection, {
            $loading: false,
            $loaded: true
          });
          return CollectionService.subset(collection).then(function(subset){
            $scope.subset = angular.extend($scope.subset, subset);
            return subset;
          });
        }

        function generateMosaic(subset) {
          return MosaicService.generate(subset);
        }

        function displayMosaic(mosaic) {
          $scope.mosaic = angular.extend(mosaic, {
            $processed: true,
            $processing: false
          });
        }

        function updateUser() {
          UserService.getUser().then(function(user){
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

  bq.directive("uiUpload", ["CollectionService", function(CollectionService){
    return {
      require: "^bqInterface",
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
        $scope.comp = {'height': el.offsetHeight, 'width': el.offsetWidth};
        $scope.clusters = testData.clusters;
        $scope.tiles = testData.tiles;
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

        tile.style.height = percent($scope.tile.ty2 - $scope.tile.ty1);
        tile.style.width = percent($scope.tile.tx2 - $scope.tile.tx1);
        tile.style.top = percent($scope.tile.ty1);
        tile.style.left = percent($scope.tile.tx1);

        var scaleX = 1 / ($scope.tile.cx2 - $scope.tile.cx1);
        var scaleY = 1 / ($scope.tile.cy2 - $scope.tile.cy1);

        img.style.width = percent(scaleX);
        img.style.height = percent(scaleY);
        img.style.top = percent(- $scope.tile.cy1 * scaleY);
        img.style.left = percent(- $scope.tile.cx1 * scaleX);
      }
    };
  }]);

  angular.element().ready(function() {
    angular.bootstrap(document, ['ui']);
  });

});
});
