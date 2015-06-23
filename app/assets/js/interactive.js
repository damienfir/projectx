require(['config'], function(){
require([
  'angular',
  'test-data',
  // 'angular-resource',
  // 'angular-animate'
], function(angular, testData){

  
  var app = angular.module("ui", []);

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

  // var $html = angular.element(document.getElementsByTagName('html')[0]);
  angular.element().ready(function() {
    angular.bootstrap(document, ['ui']);
  });

});
});
