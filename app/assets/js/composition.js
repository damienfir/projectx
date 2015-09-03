const Bacon = require('baconjs')
const Dispatcher = require('./dispatcher')

var Composition = {
  toProperty: function() {
    return Bacon.Bus();
  }
};

module.exports = Composition
