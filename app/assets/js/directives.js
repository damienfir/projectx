define([
    "app",
    "jquery",
    "services",
    "ga"
], function(bq, $, services, ga) {

  bq.directive("bqInterface", ["CollectionService", "MosaicService", "UserService", function(CollectionService, MosaicService, UserService){
    return {
      controller: function($scope) {

        function init() {
          $scope.collection = {$loaded: false, $loading: false, thumbs: []};
          $scope.mosaic = {$processed: false, $loaded: false, $shuffling: false, $processing: false, thumbnail: '/assets/stock/people/mosaic.jpg'};
          $scope.user = {_id: {$oid: ""}};
        }

        function uploadCollection(files) {
          if (!$scope.collection.$loaded) {
            var collection = CollectionService.create();
            updateUser();
            return collection.then(function(col) {
              $scope.collection = angular.extend(col, $scope.collection);
              return CollectionService.upload(files, col);
            });
          } else {
            return CollectionService.upload(files, $scope.collection);
          }
        }

        this.upload = function(files) {
          $scope.collection.$loaded = false;
          $scope.collection.$loading = true;

          return uploadCollection(files)
            .then(processCollection)
            .then(displayMosaic);
        };

        function addToCollection(uploaded) {
          $scope.collection.thumbs = $scope.collection.thumbs.concat(uploaded.filenames.map(function(x){
            return {src: x, selected: false};
          }));
        }

        function processCollection(collection) {
          $scope.collection = angular.extend(collection, {
            $loading: false,
            $loaded: true
          });
          $scope.mosaic.$processing = true;
          return MosaicService.process(collection);
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
          processCollection($scope.collection).then(displayMosaic);
        };

        $scope.reset = init;

        init();
      }
    };
  }]);

  bq.directive("bqUpload", ["CollectionService", function(CollectionService){
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
      }
    };
  }]);

  bq.directive("bqCollection", ["$q", function($q){
    return {
      link: function($scope, $element, $attr, ctrl) {
        var min_columns = 3;
        var ratio = 1.414;

        $scope.$watch("collection.length", function(length, oldLength){
          var col = Math.max(min_columns, Math.floor( 0.7 * Math.sqrt(length)));
          $scope.img_width = 100 / col;
          $scope.img_padding = $scope.img_width/ratio;
          $scope.height = (($element.outerWidth() / col) / ratio) * Math.ceil(length / col);
        });

        $scope.$watch("collection.$loaded", function(newVal, oldVal){
          if (newVal === true) {
            indices = $scope.collection.thumbs.map(function(_,i){ return i; });
            indices.forEach(function(index, i, array) {
              $scope.collection.thumbs[index].selected = true;
            });
          }
        });
      }
    };
  }]);

  bq.directive("bqMosaic", ["$animate", function($animate) {
    return {
      link: function($scope, $element, $attr, ctrl) {

        // $element.on("load", function(){
        //   // $animate.removeClass($element, "invisible").then(function(){
        //     if ($scope.mosaic.$processed) {
        //       $scope.$loaded = true;
        //     }
        //   // });
        // });

        // $scope.$watch("mosaic.thumbnail", function(val, old) {
        //   // $animate.addClass($element, "invisible").then(function() {
        //     $attr.$set("ngSrc", val);
        //   // });
        // });
      }
    };
  }]);

  bq.directive("bqShare", ["$window", function($window) {
    return {
      controller: function($scope) {
         
        var facebookID = "1580376645513631";

        function shareURL(url) {
          $window.open(url, 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600');
        }

        $scope.shareFacebook = function() {
          console.log("fb");
          var url = $scope.mosaic.url;
          console.log(url);
          ga("send", "social", "facebook", "share", url);
          ga("send", "event", "share", "facebook");
          shareURL("http://www.facebook.com/dialog/share?app_id="+facebookID+"&display=popup&href="+encodeURIComponent(url)+"&redirect_uri="+encodeURIComponent(url));
        };

        $scope.shareGoogle = function() {
          var url = $scope.mosaic.url;
          ga("send", "social", "google", "share", url);
          ga("send", "event", "share", "google");
          shareURL("https://plus.google.com/share?url=" + encodeURIComponent(url));
        };

        $scope.sharePinterest = function() {
          var url = $scope.mosaic.url;
          ga("send", "social", "pinterest", "share", url);
          ga("send", "event", "share", "pinterest");
          shareURL("https://www.pinterest.com/pin/create/button/?url="+encodeURIComponent(url)+"&media="+encodeURIComponent($scope.mosaic.thumbnail)+"&description=");
        };

        $scope.shareTwitter = function() {
          var url = $scope.mosaic.url;
          ga("send", "social", "twitter", "share", url);
          ga("send", "event", "share", "twitter");
          shareURL("https://twitter.com/intent/tweet?url="+encodeURIComponent(url));
        };
      },
      link: function($scope, $element) {
        $element.children(".modal-body button").tooltip();
      }
    };
  }]);

  bq.directive("bqSend", ["$http", function($http) {
    return {
      controller: function($scope) {
        $scope.send = function(ev) {
          var fields = ev.target.elements;
          $http.post("/users/"+$scope.user._id.$oid+"/send/"+$scope.mosaic.id, {
            to: fields.namedItem("to").value,
            from: fields.namedItem("from").value
          }).then(function(){
            var el = document.getElementById("sent-label");
            el.classList.remove("invisible");
            el.classList.add("visible");
          });
        };
      }
    };
  }]);

  bq.directive("bqDownload", [function(){
    return {
      controller: function($scope) {
        $scope.download = function(ev) {
          $http.post("/users"+$scope.user._id.$oid+"/download"+$scope.mosaic.id, {
          });
        };
      },
      link: function($scope, $element) {
        var emailRegex = /[^@]+@[^\.]+\..+/;
        var download = $element.children("#download-btn");
        $element.children("#email-input").on("input", function(ev){
          if (emailRegex.test(ev.target.value)) {
            download.attr("disabled", false);
          } else {
            download.attr("disabled", true);
          }
        });
      }
    };
  }]);

  bq.directive("bqForm", [function(){
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
          });
        });
      }
    };
  }]);

});
