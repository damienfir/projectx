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
      console.log(user);
      return self.resource.newFromUser({id: user.id}, {}).$promise;
    });
  };

  this.addPhoto = function(file, collection) {
    var fd = new FormData();
    fd.append("image", file);
    return $http.post("/collections/"+collection.id+"/photos", fd, {
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


function uiController(Collection, Composition) {
  return {
    controller: Controller
  };

  function Controller($scope) {
    var self = this;

    this.shuffleStream = new Bacon.Bus();

    $scope.reset = reset;
    $scope.more = more;
    $scope.shuffle = shuffle;

    function reset() {
      $scope.collection = undefined;
      $scope.composition = undefined;
      resetProgress();
    }

    function resetProgress() {
      $scope.nFiles = undefined;
      $scope.uploadedFiles = 0;
      $scope.uploadMore = false;
      $scope.generating = undefined;
    }

    function more() {
      $scope.uploadMore = true;
    }

    function shuffle() {
      self.shuffleStream.push($scope.collection);
    }

    function getCollectionAsStream() {
      if ($scope.collection === undefined) {
        return Bacon.fromPromise(Collection.newFromUser());
      } else {
        return Bacon.once($scope.collection);
      }
    }

    var uploadStream = $scope.$asEventStream("ui-upload").map(getStream);

    var collectionStream = uploadStream.flatMap(getCollectionAsStream);

    var responseStream = uploadStream.zip(collectionStream).flatMap(function(val) {
      return Collection.upload(val[1], Bacon.fromArray(toArray(val[0])))
        .mapEnd(val[1]);
    });

    var uploadedStream = responseStream
      .filter(".$resolved")
      .merge(this.shuffleStream);

    var compositionStream = uploadedStream
      .flatMap(Composition.generateFromCollection);

    uploadedStream.digest($scope, "collection");
    uploadedStream.onValue(function() {
      resetProgress();
      $scope.generating = true;
    });

    compositionStream.digest($scope, "composition");
    compositionStream.onValue(function(){
      $scope.generating = false;
    });
    compositionStream.onError(function() {
      console.log("error while processing");
    });

    uploadStream.map(".length").digest($scope, "nFiles");
    responseStream
      .filter(".status")
      .scan(0, function(acc, curr){ return acc+1;})
      .digest($scope, "uploadedFiles");
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
    var dropzone = document.getElementById("dropzone");
    dropzone.addEventListener("dragover", function(ev){
      ev.stopPropagation();
      ev.preventDefault();
      ev.dataTransfer.dropEffect = 'copy';
    });

    dropzone.addEventListener("drop", function(ev){
      ev.stopPropagation();
      ev.preventDefault();
      $scope.$emit("ui-upload", ev.dataTransfer.files);
    });
  }
}

})(angular);