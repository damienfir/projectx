angular.module("ui", [
    'ngResource',
    'ngCookies',
    'ngMaterial'
]);

angular.element().ready(function() {
  angular.bootstrap(document, ['ui']);
});
