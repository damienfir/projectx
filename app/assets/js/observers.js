define(function() {
  function Observers(eventList) {
    var self = this;

    self.events = eventList;
    self.callbacks = {};
    self.args = {};
    self.events.forEach(function(ev) {
      self.callbacks[ev] = [];
    });

    self.add = function(ev, func) {
      if (!self.callbacks.hasOwnProperty(ev)) {
        console.log("error: cannot register to callback '"+ev+"', does not exist");
        return;
      }
      if (self.callbacks[ev].indexOf(func) == -1) {
        self.callbacks[ev].push(func);
        if (self.args.hasOwnProperty(ev)) func.apply(null, self.args[ev]);
      }
    };

    self.notify = function(ev, args) {
      self.args[ev] = args || [];
      self.callbacks[ev].forEach(function(func){ func.apply(null, args); });
    };
  }

  return Observers;
});
