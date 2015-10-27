import {Rx} from '@cycle/core';
import _ from 'underscore';
import demo from "./demo"
import {apply, argArray, initial, jsonPOST,hasID} from './helpers'
let Observable = Rx.Observable;


function intent(HTTP) {
  return {
    createdCollection$: jsonPOST(HTTP, /\/users\/\d+\/collections/)
  }
}

function model(HTTPactions, DOMactions) {
  let demoCollection$ = DOMactions.demo$.map(x => col => demo.collection);
  let collectionUpdated$ = HTTPactions.createdCollection$.map(col => collection => col);
  let clearCollection$ = DOMactions.reset$.map(x => item => initial.collection);
  let collectionName$ = DOMactions.albumTitle$.map(name => collection => _.extend(collection, {name: name}))

  return Observable.merge(
      collectionUpdated$,
      clearCollection$,
      demoCollection$,
      collectionName$)
    .startWith(initial.collection)
    .scan(apply);
    // .shareReplay(1);
}

function requests(DOMactions, userState$, state$) {
  return {
    createCollection$: Observable.merge(
        DOMactions.selectFiles$.flatMapLatest(files => userState$.filter(hasID).map(user => [files,user])),
        DOMactions.selectFiles$.withLatestFrom(userState$, argArray).filter(([f,u]) => hasID(u)))
      .withLatestFrom(state$, argArray).filter(([x,col]) => _.isUndefined(col.id)).map(([x,col]) => x)
      .map(([f,user]) => ({
        url:'/users/'+user.id+'/collections',
        method: 'POST',
        send: {}
      }))
  }
}


module.exports = function(HTTP, DOMactions, userState$) {
  let actions = intent(HTTP);
  let state$ = model(actions, DOMactions);
  let requests$ = requests(DOMactions, userState$, state$);

  return {
    HTTP: requests$,
    state$,
    actions
  }
}
