define([
    "q"
], function(Q) {

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

    this.post = function(path, data, type) {
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

  return Request;
});
