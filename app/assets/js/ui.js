define([
    "jquery"
],
function($){

  // function Mosaic() {
  var img = $('#mosaic-img');
  var btn = $('#download-row');
  var progressbar = $("#progress-bar");
  var barRow = $("#progress-row");
  var indicatorRow = $("#indicator-row");
  var indicator = $("#indicator");
  var total = 1;

  img.load(function(ev) {
    console.log("ok");
    img.width("auto");
    img.height("50%");
  });

  img.click(function(ev) {
    img.width("auto");
    img.height("50%");
    // img.width("100%");
    // img.height("auto");
  });

  return {
    uploading: function(list) {
      total = list.length;
      progressbar.width("0%");
      barRow.fadeIn();
    },

    notify: function(progress, index) {
      var val = Math.round((progress+index)*100) / total;
      progressbar.width(val + "%");
    },

    processing: function() {
      barRow.fadeOut();
      indicatorRow.fadeIn();
      img.fadeOut();
    },

    loaded: function(filename) {
      img.load(function() {
        indicatorRow.fadeOut();
        img.fadeIn(1000, function(){
          btn.fadeIn();
        });
      });

      var url = "/storage/generated/"+filename+".jpg";
      img.attr("src", url);
      document.getElementById("download-btn").href = url;
      document.getElementById("share-btn").href = "/view/"+filename;
    }
  };
});
