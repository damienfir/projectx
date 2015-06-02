define(function() {

  function Observers(eventList) {
    this.events = eventList;
    this.callbacks = {};
    this.args = {};

    this.events.forEach(function(ev) {
      this.callbacks[ev] = [];
    }.bind(this));
  }

  Observers.prototype.add = function(ev, obj, func) {
    if (!this.callbacks.hasOwnProperty(ev)) {
      console.log("error: cannot register to callback '"+ev+"', does not exist");
      return;
    }
    var cb = {'obj': obj, 'func': func};
    if (this.callbacks[ev].indexOf(cb) == -1) {
      this.callbacks[ev].push(cb);
      if (this.args.hasOwnProperty(ev)) func.apply(obj, this.args[ev]);
    }
  };

  Observers.prototype.notify = function(ev, args) {
    this.args[ev] = args || [];
    this.callbacks[ev].forEach(function(cb){ cb.func.apply(cb.obj, args); });
  };

  return Observers;
});
