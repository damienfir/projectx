define([
  "jquery",
  "mosaic",
  "fb",
  "pinterest-api"
], function($, mosaic, FB, Pinterest){

  function Download() {
    var self = this;

    var email = document.getElementById("email-input");
    var download = document.getElementById("download-btn");
    var download_form = document.getElementById("download-form");

    download_form.addEventListener("submit", function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      window.location.assign("/assets/mosaics/"+mosaic.hash+".jpg");
    });

    email.addEventListener("input", function(ev){
      if (emailRegex.test(ev.target.value)) {
        download.disabled = false;
      } else {
        download.disabled = true;
      }
    });

    var emailRegex = /[^@]+@[^\.]+\..+/;

    document.getElementById("share-facebook").addEventListener("click", function(ev){
      FB.ui({
        method: 'share',
        href: "http://localhost/"+mosaic.hash,
      }, function(response){});
    });

    document.getElementById("share-google").addEventListener("click", function(ev){
      var url = "https://plus.google.com/share?url=" + mosaic.getViewURL();
      window.open(url, 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600');
    });

    document.getElementById("share-pinterest").addEventListener("click", function(ev){
      var url = "https://www.pinterest.com/pin/create/button/?url="+mosaic.getViewURL()+"&media="+mosaic.getImageURL()+"&description=";
      window.open(url);
    });

    this.show_buttons = function() {
      $("#output-buttons").fadeIn();
      $("#share-list > button").tooltip();
    };

    console.log(mosaic.hash);
    if (mosaic.hash !== undefined) {
      self.show_buttons();
    }
  }

  return new Download();
});
