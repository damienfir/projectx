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
    updateUser$: new Rx.Subject()
  }
}


function model(actions) {
  let newUser$ = Observable.merge(
      actions.gotUser$.filter(res => res.status !== 404).map(res => res.body),
      actions.createdUser$)
    .map(newuser => user => newuser)

  let updateUser$ = actions.updateUser$.map(obj => user => _.extend(user, obj))

  newUser$.filter(hasID).subscribe(user => cookie.setItem(COOKIE, user.id));

  return Rx.Observable.merge(
      newUser$,
      updateUser$
    )
    .startWith({})
    .scan(apply)
    .shareReplay(1);
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
      })),

    updateUser$: actions.updateUser$
      .flatMapLatest(ev => user$.take(1)
        .map(user => ({
          url: '/users',
          method: 'POST',
          send: user
        })
      ))
  };
}


module.exports = function(HTTP, DOMactions) {
  let actions = intent(HTTP);
  let state$ = model(actions)
  let requests$ = requests(DOMactions, actions, state$);

  return {
    HTTP: requests$,
    actions,
    state$
  }
}
