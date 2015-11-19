import Rx from 'rx';

import cookie from './cookies'
import {apply, isNotEmpty, jsonGET, jsonGETResponse, jsonPOST, hasID, hasNoID} from './helpers'

let Observable = Rx.Observable;

let COOKIE = 'bigpiquserid'


function intent(HTTP) {
  return {
    gotCookie$: Observable.return(cookie.getItem(COOKIE)).map(id => (id && id.match(/\d+/)) ? id : null),
    gotUser$: jsonGETResponse(HTTP, /^\/users\/\d+$/),
    createdUser$: jsonPOST(HTTP, /^\/users$/),
  }
}


function model(actions) {
  let userState$ = Observable.merge(
      actions.gotUser$.filter(res => res.status !== 404).map(res => res.body),
      actions.createdUser$)
    .map(newuser => user => newuser)
    .startWith({})
    .scan(apply)
    .shareReplay(1);

  userState$.filter(hasID).subscribe(user => cookie.setItem(COOKIE, user.id));

  return userState$;
}


function requests(DOMactions, actions, user$) {
  return {
    getUser$: actions.gotCookie$
      .filter(_.identity)
      .map(id => '/users/'+id),

    createUser$: Observable.merge(
      user$.skip(1).filter(hasNoID),
      actions.gotUser$.filter(res => res.status === 404),
      actions.gotCookie$.filter(id => id === null)
    ).take(1)
      .zip(DOMactions.selectFiles$.take(1))
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
