window.GoogleAnalyticsObject = "__ga__";
window.__ga__ = {
    q: [["create", "UA-69644-18"]],
    l: Date.now()
};

require.config({
  baseUrl: "/assets/js/",
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
    },
    "angular": {
      exports: "angular"
    },
    "angular-resource": ["angular"],
    "angular-cookies": ["angular"],
    "angular-animate": ["angular"]
  },
  paths: {
    'q': "../bower_components/q/q",
    'jquery': "../bower_components/jquery/dist/jquery.min",
    'bootstrap': "../bower_components/bootstrap/dist/js/bootstrap.min",
    'facebook-api': '//connect.facebook.net/en_US/all',
    'dropbox-api': "//www.dropbox.com/static/api/2/dropins",
    'google-api': "//apis.google.com/js/api",
    'pinterest-api': "//assets.pinterest.com/js/pinit",
    "ga": "//www.google-analytics.com/analytics",
    "skrollr": "../bower_components/skrollr/dist/skrollr.min",
    "skrollr-menu": "../bower_components/skrollr-menu/dist/skrollr.menu.min",
    "angular": "../bower_components/angular/angular",
    "angular-resource": "../bower_components/angular-resource/angular-resource",
    "angular-cookies": "../bower_components/angular-cookies/angular-cookies",
    "angular-animate": "../bower_components/angular-animate/angular-animate"
  }
});


require(['analytics', 'jquery', 'bootstrap'], function(analytics, $, _) {

  // Google Analytics triggers
  $(".modal").on("show.bs.modal", function(ev){ analytics.page($(ev.target).data("content")); });
  $("a").on("click", function(ev){ analytics.page($(ev.target).attr("href")); });
});
