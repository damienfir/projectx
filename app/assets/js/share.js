define([
  "jquery",
  "bootstrap",
  "mosaic",
  // "fb",
  // "pinterest-api",
  "backend"
], function($, _bs, mosaic, backend){

  function Share() {
    var self = this;

    var email = document.getElementById("email-input");
    var download = document.getElementById("download-btn");
    var download_form = document.getElementById("download-form");


    // Download form
    var emailRegex = /[^@]+@[^\.]+\..+/;
    email.addEventListener("input", function(ev){
      if (emailRegex.test(ev.target.value)) {
        download.disabled = false;
      } else {
        download.disabled = true;
      }
    });


    // Share handlers
    function shareURL(ev, url) {
      ev.preventDefault();
      ev.stopPropagation();
      window.open(url, 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600');
    }

    // document.getElementById("share-facebook").addEventListener("click", function(ev){
    //   ev.preventDefault();
    //   ev.stopPropagation();
    //   FB.ui({
    //     method: 'share',
    //     href: mosaic.getViewURL(),
    //   }, function(response){});
    // });

    document.getElementById("share-google").addEventListener("click", function(ev){
      shareURL(ev, "https://plus.google.com/share?url=" + mosaic.getViewURL());
    });

    document.getElementById("share-pinterest").addEventListener("click", function(ev){
      shareURL(ev, "https://www.pinterest.com/pin/create/button/?url="+mosaic.getViewURL()+"&media="+mosaic.getImageURL()+"&description=");
    });

    document.getElementById("share-twitter").addEventListener("click", function(ev){
      shareURL(ev, "https://twitter.com/intent/tweet?url="+ mosaic.getViewURL());
    });

    document.getElementById("share-instagram").addEventListener("click", function(ev){
      shareURL("https://twitter.com/intent/tweet?url="+ mosaic.getViewURL());
    });

    // Methods
    this.show_buttons = function() {
      $("#share-btn").fadeTo(400, 1);
      $("#share-list button, #share-list .div-btn").tooltip();
      $("#share-link").val(mosaic.getViewURL());
      $("#goto-btn").attr("href", mosaic.getViewURL());
    };

    this.hide_buttons = function() {
      $("#share-btn").fadeTo(400, 0);
    };

    mosaic.watch.add("loaded", function() {
      self.show_buttons();
    });
  }

  return new Share();
});
