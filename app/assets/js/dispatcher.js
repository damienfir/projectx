const Bacon = require('baconjs')

var Dispatcher = function() {
  const busCache = {}

  this.stream = (name) => bus(name)
  this.push = (name, value) => bus(name).push(value)
  this.plug = (name, value) => bus(name).plug(value)

  function bus(name) {
    return busCache[name] = busCache[name] || new Bacon.Bus()
  }
}

module.exports = Dispatcher
