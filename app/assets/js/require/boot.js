require(['config'], function(){
  require(['app', 'interactive', 'directives', 'resources', 'services', 'controllers'], function(app) {
    angular.element().ready(function() {
      angular.bootstrap(document, ['ui']);
    });
  });
});
