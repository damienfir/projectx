require.config({
  shim: {
    'bootstrap': ['jquery'],
    'facebook-api' : {
      exports: 'FB'
    },
    'dropbox-api': {
      exports: 'Dropbox'
    }
  },
  paths: {
    'q': "/assets/bower_components/q/q",
    'jquery': "/assets/bower_components/jquery/dist/jquery.min",
    'bootstrap': "/assets/bower_components/bootstrap/dist/js/bootstrap.min",
    'facebook-api': '//connect.facebook.net/en_US/all',
    'dropbox-api': "//www.dropbox.com/static/api/2/dropins",
    'google-api': "//apis.google.com/js/api",
    'pinterest-api': "//assets.pinterest.com/js/pinit"
  }
});

require(['bootstrap', 'add', 'mosaic', 'dropbox', 'share']);
