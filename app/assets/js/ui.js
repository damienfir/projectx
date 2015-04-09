define([
    "jquery",
    "mosaic"
],
function($, mosaic){

  // function Mosaic() {
  var img = $('#mosaic-img');
  var btn = $('#download-row');
  var progressbar = $("#progress-bar");
  var barRow = $("#progress-row");
  var indicatorRow = $("#indicator-row");
  var indicator = $("#indicator");
  var total = 1;

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

      img.attr("src", mosaic.getImageURLSmall());
      document.getElementById("download-btn").href = mosaic.getImageURL();
      document.getElementById("share-btn").href = mosaic.getViewURL();
    }
  };
});
