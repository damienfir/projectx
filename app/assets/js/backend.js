define([
    "request"
], function(Request) {

  return {
    uploadFromDropbox: function(files) {
      var http = new Request();
      return http.post("/dropbox", files);
    },

    uploadFile: function(filedata) {
      var http = new Request();
      var fd = new FormData();
      fd.append("image", filedata);
      return http.postData("/upload", fd);
    },

    process: function() {
      var http = new Request();
      return http.get("/process");
    },

    reset: function() {
      var http = new Request();
      return http.get("/reset");
    },

    upload: function(files) {
      
    },

    stock: function() {
      var http = new Request();
      return http.get("/stock");
    },

    questions: function() {
      return (new Request()).get("/questions");
    },

    feedback: function(question_id, choice) {
      return (new Request()).post("/feedback", JSON.stringify({
        "question_id": question_id,
        "choice": choice
      }));
    }
  };
});
