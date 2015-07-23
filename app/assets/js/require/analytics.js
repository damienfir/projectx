define([
    "ga"
], function(ga){
  return {
    'page': function(content) {
      if (ga !== undefined)
        ga('send', 'pageview', content);
    },
    'event': function(evt, name) {
      if (ga !== undefined)
        ga("send", "event", "share", "facebook");
    },
    'share': function(network, url) {
      if (ga !== undefined)
        ga("send", "social", network, "share", url);
      this.event(network);
    }
  };
});
