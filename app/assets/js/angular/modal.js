(function(){
  'use strict';

angular.module("ui")
  // .directive("bqShare", bqShare)
  // .directive("bqSend", bqSend)
  // .directive("bqDownload", bqDownload)
  // .directive("bqForm", bqForm)
  .directive("bqFeedback", bqFeedback)
  .directive("uiControls", uiControls);


/* @ngInject */
function uiControls($mdDialog) {
  return {
    controller: function($scope) {
      // $scope.showOrder = function(ev) {
      //   $mdDialog.show(makeDialog(ev, OrderController, "/assets/templates/order.html"));
      // };

      $scope.showDownload = function(ev) {
        $mdDialog.show({
          controller: DownloadController,
          templateUrl: "/assets/templates/download.html",
          scope: $scope
        });
      };

      // $scope.showSend = function(ev) {
      //   $mdDialog.show(makeDialog(ev, OrderController, "/assets/templates/send.html"));
      // };

      // $scope.showShare = function(ev) {
      //   $mdDialog.show(makeDialog(ev, OrderController, "/assets/templates/share.html"));
      // };
    }
  };
}


/* @ngInject */
function DownloadController($scope, $mdDialog, $http, $window) {
  $scope.download = function() {
    $scope.button = "Generating...";
    $http.post("/mosaics/generate", $scope.composition).then(function() {
      $mdDialog.hide();
      $scope.button = undefined;
      $window.location.href = "/users/"+$scope.user.id+"/download/"+$scope.composition.id+"?email="+encodeURIComponent($scope.email);
    });
  };
}


/* @ngInject */
function bqShare($window) {
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
      // $element.children(".modal-body button").tooltip();
    }
  };
}


/* @ngInject */
function bqSend($http, $window) {
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
}


/* @ngInject */
function bqForm($http){
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
}


/* @ngInject */
function bqFeedback($http){
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
}

})();
