require(['config'], function(){
  require(['app', 'directives', 'resources', 'services', 'controllers'], function(bq) {
    var $html = angular.element(document.getElementsByTagName('html')[0]);
    angular.element().ready(function() {
      angular.bootstrap(document, ['bq']);
    });
  });
});
