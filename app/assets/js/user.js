import {Rx} from '@cycle/core';
// import _ from 'underscore';

import cookie from './cookies'
import {apply, isNotEmpty, jsonGET, jsonPOST, hasID, hasNoID} from './helpers'

let Observable = Rx.Observable;

let COOKIE = 'bigpiquser'


function intent(HTTP) {
  return {
    gotCookie$: Observable.return(cookie.getItem(COOKIE)).map(id => (id && id.match(/\d+/)) ? id : null),
    gotUser$: jsonGET(HTTP, /^\/users\/\d+$/),
    createdUser$: jsonPOST(HTTP, /^\/users$/),
  }
}


function model(actions) {
  let userState$ = Observable.merge(
      actions.gotUser$,
      actions.createdUser$)
    .map(newuser => user => newuser)
    .startWith({})
    .scan(apply);

  userState$.filter(hasID).subscribe(user => cookie.setItem(COOKIE, user.id));

  return userState$;
}


function requests(DOMactions, actions, userState$) {
  return {
    getUser$: actions.gotCookie$
      .filter(_.identity)
      .map(id => '/users/'+id),

    createUser$: Observable.merge(
      userState$.skip(1).filter(hasNoID),
      actions.gotCookie$.filter(id => id === null).do(x => console.log(x))
    ).take(1)
      .zip(DOMactions.selectFiles$.take(1)).do(x => console.log(x))
      .map(x => ({
        method: 'POST',
        url: '/users',
        send: {}
      }))
  };
}


module.exports = function(HTTP, DOMactions) {
  let actions = intent(HTTP);
  let state$ = model(actions)
  let requests$ = requests(DOMactions, actions, state$);

  return {
    HTTP: requests$,
    state$
  }
}
