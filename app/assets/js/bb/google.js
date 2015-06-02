
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
