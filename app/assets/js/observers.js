define(function() {
  function Observers(eventList) {
    var self = this;
    self.events = eventList;
    self.callbacks = {};
    self.notified = {};
    self.events.forEach(function(ev) {
      self.callbacks[ev] = [];
      self.notified[ev] = false;
    });

    self.add = function(ev, func) {
      if (self.callbacks[ev].indexOf(func) == -1) {
        self.callbacks[ev].push(func);
        if (self.notified[ev]) func();
      }
    };

    self.notify = function(ev) {
      self.notified[ev] = true;
      self.callbacks[ev].forEach(function(func){ func(); });
    };
  }

  return Observers;
});
