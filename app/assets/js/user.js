import Dispatcher from './dispatcher'
import Bacon from 'baconjs'
import _ from 'underscore'
import $ from 'jquery'

var d = new Dispatcher();

var User = {
  toProperty(initial) {

    return Bacon.update(initial,
      [d.stream('get')], get,
      [d.stream('set')], set
    );

    function get(user) {
      if (_.isUndefined(user) || _.isEmpty(user)) {
        d.plug('set', Bacon.fromPromise($.get("/users/1")));
      }
      return user;
    }

    function set(user, newUser) {
      return newUser;
    }
  },

  getCurrent() { d.push('get') }
}

module.exports = User;
