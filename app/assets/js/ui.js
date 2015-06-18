require(['config'], function(){
require([
  'angular',
  'angular-resource',
  // 'angular-animate'
], function(angular){

  var app = angular.module("ui", [
      "ngResource",
      // "ngCookies",
      // "ngAnimate"
  ]);

  app.factory('Composition', ['$resource', function($resource){
    return  $resource('/subset/:id/composition/:comp_id',
      {id: '55803f3e2600002a00b683b7', comp_id: '55803f462600002900b683ba'});
  }]);
  
  app.directive('ui-interface', ['Composition', function(Composition){
    return {
      link: function($scope, $element) {
        $scope.composition = Composition.get();


      }
    };
  }]);


  // var $html = angular.element(document.getElementsByTagName('html')[0]);
  angular.element().ready(function() {
    angular.bootstrap(document, ['ui']);
  });

});
});
