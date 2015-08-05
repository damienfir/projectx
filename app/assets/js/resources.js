(function(){
  'use strict';

angular.module("ui")
  .factory("Users", Users)
  .factory("Collections", Collections)
  .factory("Compositions", Compositions);

function Users($resource){
  return $resource("/users/:id", {}, {
    newCollection: {url: "/users/:id/collections", method: "POST"}
  });
}


function Collections($resource){
  return $resource("/collections/:id", {}, {
    addPhoto: {url: "/collections/:id/photos", method: "POST"},
  });
}

function Compositions($resource){
  return $resource("/mosaics/:id", {}, {
    generate: {url: "/collections/:id/mosaics", method: "POST"}
  });
}

})();
