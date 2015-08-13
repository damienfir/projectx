(function(angular){
  'use strict';


angular.module("ui", [
    'ngMaterial',
    'ui.collection'
])
.config(function($mdThemingProvider, $mdIconProvider) {
  $mdThemingProvider.theme('default')
    .primaryPalette('blue')
    .accentPalette('red');
  $mdIconProvider.fontSet('fa', 'fontawesome');
});


})(angular);
