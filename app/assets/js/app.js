angular.module("ui", [
    'ngResource',
    'ngCookies',
    'ngMaterial'
])
.config(function($mdThemingProvider, $mdIconProvider) {
  $mdThemingProvider.theme('default')
    .primaryPalette('blue')
    .accentPalette('red');
  $mdIconProvider.fontSet('fa', 'fontawesome');
});

// angular.element().ready(function() {
//   angular.bootstrap(document, ['ui']);
// });
