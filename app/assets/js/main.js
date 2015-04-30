window.GoogleAnalyticsObject = "__ga__";
window.__ga__ = {
    q: [["create", "UA-69644-18", "none"]],
    l: Date.now()
};

require.config({
  shim: {
    'bootstrap': ['jquery'],
    'facebook-api' : {
      exports: 'FB'
    },
    'dropbox-api': {
      exports: 'Dropbox'
    },
    "ga": {
      exports: "__ga__"
    }
  },
  paths: {
    'q': "../bower_components/q/q",
    'jquery': "../bower_components/jquery/dist/jquery.min",
    'bootstrap': "../bower_components/bootstrap/dist/js/bootstrap.min",
    'facebook-api': '//connect.facebook.net/en_US/all',
    'dropbox-api': "//www.dropbox.com/static/api/2/dropins",
    'google-api': "//apis.google.com/js/api",
    'pinterest-api': "//assets.pinterest.com/js/pinit",
    "ga": "//www.google-analytics.com/analytics"
  }
});

require(['ga', 'ui'], function(ga){
  ga('send', 'pageview');
});
