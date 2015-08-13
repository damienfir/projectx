(function(angular){
  'use strict';

angular.module("ui.collection", [
    "ngResource",
    "ui.composition",
    "ui.user",
    "angular-bacon"
  ])
  .service("Collection", Collection)
  .directive("uiController", uiController)
  .directive("uiInterface", uiInterface)
  .directive("uiUpload", uiUpload);


/* @ngInject */
function Collection($q, $http, $resource, User) {
  var self = this;

  this.resource = $resource("/collections/:id", {}, {
    addPhoto: {url: "/collections/:id/photos", method: "POST"},
    newFromUser: {url: "/users/:id/collections", method: "POST"}
  });

  this.newFromUser = function() {
    return User.getUser().then(function(user){
      return self.resource.newFromUser({id: user._id.$oid}, {}).$promise;
    });
  };

  this.addPhoto = function(file, collection) {
    var fd = new FormData();
    fd.append("image", file);
    return $http.post("/collections/"+collection._id.$oid+"/photos", fd, {
      transformRequest: angular.identity,
      headers: {'Content-Type': undefined}
    });
  };

  this.uploadToCollection = function(files, collection) {
    files = getValidFiles(files);
    var defer = $q.defer();
    function chainUpload(index) {
      if (files.length > index) {
        self.addPhoto(files[index], collection).then(function(res){
          defer.notify(res.data);
          chainUpload(index+1);
        });
      } else {
        defer.resolve(collection);
      }
    }
    chainUpload(0);
    return defer.promise;
  };

  this.upload = function(collection, fileStream) {
    return fileStream
      .filter(validateFileType)
      .flatMap(function(file) {
        return Bacon.fromPromise(self.addPhoto(file, collection));
      });
  };
}


/* @ngInject */
function uiInterface(Collection, Composition, User){
  return {
    controller: Controller
  };

  function Controller($scope) {

    this.upload = upload;
    $scope.reset = init;
    $scope.shuffle = shuffle;
    $scope.isEmpty = isEmpty;

    function init() {
      $scope.user = undefined;
      $scope.collection = undefined;
      $scope.composition = undefined;
      $scope.upload = undefined;
    }

    function uploadCollection(files) {
      if ($scope.collection === undefined) {
        return Collection.newFromUser().then(function(col) {
          $scope.collection = col;
          return Collection.uploadToCollection(files, col);
        });
      } else {
        return Collection.uploadToCollection(files, $scope.collection);
      }
    }

    function generateComposition(collection) {
      $scope.upload = undefined;
      return Composition.generateFromCollection(collection);
    }

    function displayComposition(composition) {
      $scope.composition = composition;
    }

    function updateUser() {
      return User.getUser().then(function(user){
        $scope.user = user;
      });
    }

    function upload(files) {
      $scope.upload.size = files.length();
      return uploadCollection(files)
        .then(generateComposition)
        .then(displayComposition)
        .then(updateUser);
    }

    function shuffle() {
      generateComposition($scope.collection)
        .then(displayComposition);
    }

    init();
  }
}


function getStream(ev) {
  return ev.args[0];
}

function toArray(filelist) {
  var list = [];
  for (var i = 0; i < filelist.length; i++) list.push(filelist[i]);
  return list;
}

function uiController(Collection) {
  return {
    controller: Controller
  };

  function Controller($scope) {
    var fileListFromUpload = $scope.$asEventStream("ui-upload")
      .map(getStream);

    fileListFromUpload.flatMap(function(files){
      var collection;
      if ($scope.collection === undefined) {
        collection = Bacon.fromPromise(Collection.newFromUser());
      } else {
        collection = Bacon.once($scope.collection);
      }
      return collection.flatMap(function(col) {
        $scope.collection = col;
        return Collection.upload(col, Bacon.fromArray(toArray(files)));
      });
    })
    .onValue(function(v){ console.log(v);});
  }
}


function uiUpload(){
  return {
    controller: Controller,
    link: Link,
    templateUrl: "/assets/templates/upload.directive.html"
  };

  function Controller($scope) {
    var fileupload = angular.element(document.getElementById("file-upload"));

    $scope.triggerUpload = function(ev) {
      fileupload.trigger("click");
    };

    var filesFromForm = Bacon.fromEvent(fileupload, "change", function(ev){
      return ev.target.files;
    });

    filesFromForm.onValue(function(files){
      $scope.$emit("ui-upload", files);
    });
  }

  function Link($scope) {
    // var dropzone = document.getElementById("dropzone");
    // dropzone.addEventListener("dragover", function(ev){
    //   ev.stopPropagation();
    //   ev.preventDefault();
    //   ev.dataTransfer.dropEffect = 'copy';
    // });

    // dropzone.addEventListener("drop", function(ev){
    //   ev.stopPropagation();
    //   ev.preventDefault();
    //   uictrl.upload(ev.dataTransfer.files);
    // });
  }
}

})(angular);
