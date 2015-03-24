requirejs.config({
  shim: {
    'facebook' : {
      exports: 'FB'
    }
  },
  paths: {
    q: "/assets/bower_components/q/q",
    jquery: "/assets/bower_components/jquery/dist/jquery.min",
    'facebook': '//connect.facebook.net/en_US/all'
  }
});

requirejs(['q', 'jquery'], function(Q, $) {


var Request = function() {
  this.http = new XMLHttpRequest();
  var self = this;

  this.request = function(method, path) {
    self.http.open(method, path, true);
    var deferred = Q.defer();
    self.http.onload = function() {
        if (self.http.status == 200) {
          deferred.resolve(http.response);
        }
        else {
          deferred.reject(new Error(self.http.statusText));
        }
    };
    self.http.onerror = function() {
      deferred.reject(new Error("error"));
    };
    return deferred.promise;
  };

  this.setContent = function(type) {
    if (type === undefined) {
      self.http.setRequestHeader("Content-Type", "application/json");
    }
    else {
      self.http.setRequestHeader("Content-Type", type);
    }
  };

  this.get = function(path, params, type) {
    var promise = self.request("GET", path);
    self.setContent(type);
    self.http.send(params);
    return promise;
  };

  this.post = function(path, data, params, type) {
    var promise = self.request("POST", path);
    self.setContent(type);
    self.http.send(data);
    return promise;
  };

  this.postData = function(path, data) {
    var promise = self.request("POST", path);
    self.http.send(data);
    return promise;
  };
};

var Backend = function() {
  var self = this;

  this.uploadFromDropbox = function(files) {
    var http = new Request();
    return http.post("/dropbox", files);
  };

  this.uploadFile = function(filedata) {
    var http = new Request();
    var fd = new FormData();
    fd.append("image", filedata);
    return http.postData("/upload", fd);
  };

  this.imagesList = function (){
    var http = new Request();
    return http.get("/session/info").then(function(info){
      return info.images;
    });
  };
};


var DropboxModule = function(backend) {
  document.getElementById("dropbox-btn").addEventListener("click", function() {
    Dropbox.choose({
      success: function(files) {
        backend.uploadFromDropbox(JSON.stringify(files)).then(function() {
          
        });
      },
      linkType: "direct",
      multiselect: true,
      extensions: ['images'],
    });
  });
};


var GoogleModule = function(backend) {
  var self = this;
  // The Browser API key obtained from the Google Developers Console.
  self.developerKey = 'AIzaSyBd98lhG8PvA2jEnWoTJNxocQK4bGwIe_c';

  // The Client ID obtained from the Google Developers Console. Replace with your own Client ID.
  self.clientId = "467876438264-opkno6jondi39e7c4rdmlik8e50dqs07.apps.googleusercontent.com";

  // Scope to use to access user's photos.
  self.scope = ['https://www.googleapis.com/auth/photos'];

  self.pickerApiLoaded = false;
  self.oauthToken = undefined;

  // Use the API Loader script to load google.picker and gapi.auth.
  this.onApiLoad = function(ev) {
    ev.preventDefault();
    ev.stopPropagation();

    gapi.load('auth', {'callback': onAuthApiLoad});
    gapi.load('picker', {'callback': onPickerApiLoad});
  };

  document.getElementById("google-btn").addEventListener("click", this.onApiLoad);

  function onAuthApiLoad() {
    window.gapi.auth.authorize(
        {
          'client_id': self.clientId,
          'scope': self.scope,
          'immediate': false
        },
        self.handleAuthResult);
  }

  function onPickerApiLoad() {
    self.pickerApiLoaded = true;
    self.createPicker();
  }

  this.handleAuthResult = function(authResult) {
    if (authResult && !authResult.error) {
      self.oauthToken = authResult.access_token;
      self.createPicker();
    }
  };

  // Create and render a Picker object for picking user Photos.
  this.createPicker = function() {
    if (self.pickerApiLoaded && self.oauthToken) {
      console.log("creating");
      var picker = new google.picker.PickerBuilder().
        addView(google.picker.ViewId.PHOTOS).
        setOAuthToken(self.oauthToken).
        setDeveloperKey(self.developerKey).
        // setCallback(self.pickerCallback).
        build();
      console.log(picker);
      picker.setVisible(true);
    }
  };

  // A simple callback implementation.
  this.pickerCallback = function(data) {
    var url = 'nothing';
    if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
      var doc = data[google.picker.Response.DOCUMENTS][0];
      url = doc[google.picker.Document.URL];
    }
    console.log("picked: "+ url);
  };
};


var UploadModule = function (backend, gallery) {
  var self = this;

  this.dropHandler = function(ev) {
    ev.stopPropagation();
    ev.preventDefault();

    var files = ev.dataTransfer.files;
    for (var i = 0, f; (f = files[i]); i++) {
      if (!f.type.match("image.*")) continue;
      backend.uploadFile(f);
    }
  };

  this.submitHandler = function(ev) {
    ev.stopPropagation();
    ev.preventDefault();

    var files = document.getElementById("file-upload").files;
    for (var i = 0, f; (f = files[i]); i++) {
      if (!f.type.match("image.*")) continue;
      backend.uploadFile(f);
    }
  };


  // document.getElementById("upload-btn").addEventListener("click", function() {
  //   var wrapper = document.getElementById('dropzone-wrapper');
  //   if (!wrapper.style.display || wrapper.style.display === "none") {
  //     wrapper.style.display = "block";
  //   } else {
  //     wrapper.style.display = "none";
  //   }
  // });

  var dropzone = document.getElementById("dropzone");
  dropzone.addEventListener("dragover", function(ev){
    ev.stopPropagation();
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'copy';
  });

  dropzone.addEventListener("drop", self.dropHandler);
  document.getElementById("upload-form").addEventListener("submit", this.submitHandler);
};


var backend = new Backend();
new UploadModule(backend);
new DropboxModule(backend);
// new GoogleModule();

});
