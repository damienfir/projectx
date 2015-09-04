import Dispatcher from './dispatcher'
import Bacon from 'baconjs'
import _ from 'underscore'
import $ from 'jquery'

var d = new Dispatcher();

var User = {
  toProperty(initial) {
    return Bacon.update(initial,
      [d.stream('get')], get
    ).flatMap(x => x);

    function get(user) {
      if (_.isUndefined(user) || _.isEmpty(user)) {
        return Bacon.fromPromise($.get("/users/1"));
      } else {
        return Bacon.once(user);
      }
    }
  },

  getCurrent() { d.push('get') }
}

module.exports = User;
