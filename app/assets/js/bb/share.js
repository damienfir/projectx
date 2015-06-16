define([
  "mosaic",
  "backend",
  "ga"
], function(mosaic, backend, ga){

  function Share() {
    var self = this;

    var email = document.getElementById("email-input");
    var download = document.getElementById("download-btn");
    var download_form = document.getElementById("download-form");

    var facebookID = "1580376645513631";

    // Download form
    var emailRegex = /[^@]+@[^\.]+\..+/;
    email.addEventListener("input", function(ev){
      if (emailRegex.test(ev.target.value)) {
        download.disabled = false;
      } else {
        download.disabled = true;
      }
    });

    // document.getElementById("share-link").addEventListener("focus", function(ev) {
    //   ev.target.setSelectionRange(0, ev.target.value.length);
    // });

    document.getElementById("email-form").addEventListener("submit", function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      var fields = ev.target.elements;
      backend.email(fields.namedItem("to").value, fields.namedItem("from").value).then(function(){}, function(){}, function(){
        var el = document.getElementById("sent-label");
        el.classList.remove("invisible");
        el.classList.add("visible");
      });
    });


    // Share handlers
    function shareURL(ev, url) {
      ev.preventDefault();
      ev.stopPropagation();
      window.open(url, 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600');
    }

    document.getElementById("share-facebook").addEventListener("click", function(ev){
      var url = mosaic.getViewURL();
      ga("send", "social", "facebook", "share", url);
      ga("send", "event", "share", "facebook");
      shareURL(ev, "http://www.facebook.com/dialog/share?app_id="+facebookID+"&display=popup&href="+encodeURIComponent(url)+"&redirect_uri="+encodeURIComponent(mosaic.getViewURL()));
    });

    document.getElementById("share-google").addEventListener("click", function(ev){
      var url = mosaic.getViewURL();
      ga("send", "social", "google", "share", url);
      ga("send", "event", "share", "google");
      shareURL(ev, "https://plus.google.com/share?url=" + encodeURIComponent(url));
    });

    document.getElementById("share-pinterest").addEventListener("click", function(ev){
      var url = mosaic.getViewURL();
      ga("send", "social", "pinterest", "share", url);
      ga("send", "event", "share", "pinterest");
      shareURL(ev, "https://www.pinterest.com/pin/create/button/?url="+encodeURIComponent(url)+"&media="+encodeURIComponent(mosaic.getImageURL())+"&description=");
    });

    document.getElementById("share-twitter").addEventListener("click", function(ev){
      var url = mosaic.getViewURL();
      ga("send", "social", "twitter", "share", url);
      ga("send", "event", "share", "twitter");
      shareURL(ev, "https://twitter.com/intent/tweet?url="+encodeURIComponent(url));
    });

    // document.getElementById("share-instagram").addEventListener("click", function(ev){
    //   var url = mosaic.getViewURL();
    //   ga("send", "social", "instagram", "share", url);
    //   shareURL("https://twitter.com/intent/tweet?url=" + url);
    // });
    //

  }

  return new Share();
});