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

requirejs(['q'], function(Q) {


var Request = function() {
  var self = this;
  var http = new XMLHttpRequest();

  this.request = function(method, path) {
    return Q.Promise(function(resolve, reject, notify){
      http.open(method, path, true);
      http.onload = function(ev) {
        if (ev.target.status == 200) {
          resolve(ev.target.response);
        }
        else {
          reject(new Error(ev.target.statusText));
        }
      };
      http.onerror = function(ev) {
        reject(new Error(ev.target.statusText));
      };
      http.upload.onprogress = function(ev) {
        notify(ev.loaded / ev.total);
      };
    });
  };

  this.setContent = function(type) {
    if (type === undefined) {
      http.setRequestHeader("Content-Type", "application/json");
    }
    else {
      http.setRequestHeader("Content-Type", type);
    }
  };

  this.get = function(path, params, type) {
    var promise = self.request("GET", path);
    self.setContent(type);
    http.send(params);
    return promise;
  };

  this.post = function(path, data, params, type) {
    var promise = self.request("POST", path);
    self.setContent(type);
    http.send(data);
    return promise;
  };

  this.postData = function(path, data) {
    var promise = self.request("POST", path);
    http.send(data);
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

  this.process = function() {
    var http = new Request();
    return http.get("/process");
  };

  this.reset = function() {
    var http = new Request();
    return http.get("/reset");
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

var ProgressBar = function(list) {
  var bar = $("#progress-bar");
  bar.width("0%");
  $("#progress-row").fadeIn();
  var total = list.length;

  this.notify = function(progress, index) {
    var val = Math.round((progress+index)*100) / total;
    bar.width(val + "%");
  };

  this.finish = function() {
    bar.fadeOut();
    bar.width("0%");
    $("#progress-row").fadeOut();
  };
};


var Mosaic = function() {
  var img = $('#mosaic-img');
  var btn = $('#download-row');
  
  this.reload = function(url) {
    img.fadeOut();
    btn.fadeOut();
    img.attr("src", "/assets/mosaics/"+url);
    img.fadeIn(1000, function(){
      btn.fadeIn();
    });
  };
};


var UploadModule = function (backend, mosaic) {
  var self = this;
  self.progressBar = undefined;

  var dropzone = document.getElementById("dropzone");

  this.uploadFiles = function(files) {
    return Q.Promise(function(resolve, reject){
      function chainUpload(index) {
        if (files.length > index) {
          backend.uploadFile(files[index]).then(
              function(res){
                chainUpload(index+1);
              }, reject,
              function(progress) {
                if (self.progressBar !== undefined) {
                  self.progressBar.notify(progress, index);
                }
              });
        } else {
          resolve();
        }
      }
      chainUpload(0);
    });
  };

  this.dropHandler = function(ev) {
    ev.stopPropagation();
    ev.preventDefault();

    var files = ev.dataTransfer.files;
    self.progressBar = new ProgressBar(files);
    $("#upload-modal").modal("hide");

    self.uploadFiles(files).then(function(){
      return backend.process();
    }).then(function(res){
      var obj = JSON.parse(res);
      mosaic.reload(obj.mosaic);
      backend.reset();
    });
  };

  this.dragHandler = function(ev) {
    ev.stopPropagation();
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'copy';
  };

  this.submitHandler = function(ev) {
    ev.stopPropagation();
    ev.preventDefault();

    var files = document.getElementById("file-upload").files;
    self.progressBar = new ProgressBar(files);
    self.uploadFiles(files);
  };

  dropzone.addEventListener("dragover", self.dragHandler);
  dropzone.addEventListener("drop", self.dropHandler);
  document.getElementById("upload-form").addEventListener("submit", this.submitHandler);
};


var backend = new Backend();
var mosaic = new Mosaic();
new UploadModule(backend, mosaic);
// new DropboxModule(backend);
// new GoogleModule();

});
