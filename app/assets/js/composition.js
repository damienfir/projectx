const Bacon = require('baconjs')
const Dispatcher = require('./dispatcher')
const $ = require("jquery");

var d = new Dispatcher();

var Composition = {
  toProperty: function(initial) {
    return Bacon.update(initial,
      [d.stream('generate')], generate
    ).flatMap(x => x);

    function generate(composition, collection) {
      return Bacon.fromPromise($.post("/collections/"+collection.id+"/mosaics"));
    }
  },

  generate(collection) { d.push('generate', collection); }
};

module.exports = Composition
