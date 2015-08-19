(function(angular){
  'use strict';

angular.module("ui")
  .directive("uiUpload", uiUpload)
  .directive("uiControls", uiControls);



function uiControls($mdDialog) {
  return {
    'controller': function($scope) {
        function makeDialog(ev, controller, template) {
          return {
            controller: controller,
            templateUrl: template,
            parent: angular.element(document.body),
            targetEvent: ev,
            clickOutsideToClose: true
          };
        }

      $scope.showOrder = function(ev) {
        $mdDialog.show(makeDialog(ev, OrderController, "/assets/templates/order.html"));
      };

      $scope.showDownload = function(ev) {
        $mdDialog.show(makeDialog(ev, OrderController, "/assets/templates/download.html"));
      };

      $scope.showSend = function(ev) {
        $mdDialog.show(makeDialog(ev, OrderController, "/assets/templates/send.html"));
      };

      $scope.showShare = function(ev) {
        $mdDialog.show(makeDialog(ev, OrderController, "/assets/templates/share.html"));
      };
    }
  };
}

function OrderController($scope, $mdDialog) {

}

})(angular);
