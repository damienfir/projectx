(function(){
  'use strict';

angular.module("ui.user", [
    "ngResource",
    "ngCookies"
  ])
  .service("User", User);


/* @ngInject */
function User($cookies, $resource){
  var self = this;
  this.cookie = "bquser";

  this.resource = $resource("/users/:id");

  this.getUser = function() {
    if (this.user === undefined) {

      var user_id = $cookies.get(this.cookie);

      if (user_id === undefined) {
        this.user = this.resource.save({}, function(res) {
          $cookies.put(self.cookie, res.id);
        });
      } else {
        this.user = this.resource.get({id: user_id});
        this.user.$promise.catch(function(){
          console.log("catch");
          self.user = undefined;
          $cookies.remove(self.cookie);
          self.getUser();
        });
      }
    }

    return this.user.$promise;
  };
}

})();
