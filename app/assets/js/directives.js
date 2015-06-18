define([
    "app",
    "jquery",
    "services",
    "analytics"
], function(
  bq,
  $,
  services,
  analytics
  ) {

  var valid_formats = ['image/jpeg', 'image/png'];

  bq.directive("bqInterface", ["CollectionService", "MosaicService", "UserService", function(CollectionService, MosaicService, UserService){
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
          analytics.event("display-mosaic", mosaic.id);
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
          analytics.event("shuffle", "");
        };

        $scope.reset = function(){ 
          init();
          analytics.event("reset", "");
        };

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
          analytics.event("upload-photos", ev.target.files.length);
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
          analytics.event("drop-photos", ev.dataTransfer.files.length);
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

  bq.directive("bqSend", ["$http", "$window", function($http, $window) {
    return {
      controller: function($scope) {
        function reset(){
          $scope.sent = false;
        }

        $scope.sendTo = function() {
          $http.post("/users/"+$scope.user._id.$oid+"/send/"+$scope.mosaic.id, {
            to: $scope.to,
            from: $scope.from
          }).then(function(){
            $scope.sent = true;
            $window.setTimeout(reset, 2000);
          });
        };
      }
    };
  }]);

  bq.directive("bqDownload", ["$http", function($http){
    return {
      // controller: function($scope) {
      //   $scope.download = function(ev) {
      //     $http.post("/users"+$scope.user._id.$oid+"/download"+$scope.mosaic.id, {
      //     });
      //   };
      // },
      link: function($scope) {
        var emailRegex = /[^@]+@[^\.]+\..+/;
        var form = angular.element(document.getElementById("download-form"));
        var download = angular.element(document.getElementById("download-btn"));
        angular.element(document.getElementById("email-input")).on("input", function(ev){
          if (emailRegex.test(ev.target.value)) {
            download.attr("disabled", false);
          } else {
            download.attr("disabled", true);
          }
        });
      }
    };
  }]);

  bq.directive("bqForm", ["$http", function($http){
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


  bq.directive("bqFeedback", ["$http", function($http){
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

});
