angular.module("ui", [
    'ngResource',
    'ngCookies'
]);

angular.element().ready(function() {
  angular.bootstrap(document, ['ui']);
});
