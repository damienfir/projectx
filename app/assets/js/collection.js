import Rx from 'rx';
import {apply, argArray, initial, jsonPOST, jsonGET, hasID} from './helpers'
let Observable = Rx.Observable;


function intent(DOM, HTTP) {
  return {
    createdCollection$: jsonPOST(HTTP, /\/users\/\d+\/collections/),
    storedAlbum$: jsonGET(HTTP, /\/users\/\d+\/albums\/[\w\d-]+/),
    albumTitle$: DOM.select('#album-title').events("input").map(ev => ev.target.value),
    clickTitle$: DOM.select(".cover-title").events('click')
  }
}


function events(DOMactions, actions) {
  actions.clickTitle$.do(x => console.log(x)).subscribe(ev => document.getElementById("album-title").focus());
  DOMactions.reset$.subscribe(x => window.history.pushState({}, '', '/ui'));
}


function model(actions, DOMactions) {
  let storedCollection$ = actions.storedAlbum$.map(demo => col => demo.collection);
  let collectionUpdated$ = actions.createdCollection$.map(col => collection => col);
  let clearCollection$ = DOMactions.reset$.map(x => item => initial.collection);
  let collectionName$ = actions.albumTitle$.map(name => collection => _.extend(collection, {name: name}))

  actions.createdCollection$
    .merge(actions.storedAlbum$
        .map(d => d.collection))
    .subscribe(col => window.history.pushState({}, '', '/ui/'+col.hash));

  return Observable.merge(
      collectionUpdated$,
      clearCollection$,
      storedCollection$,
      collectionName$)
    .startWith(initial.collection)
    .scan(apply)
    .shareReplay(1);
}


function requests(DOMactions, upload, user, collection$) {
  return {
    createCollection$: DOMactions.selectFiles$
      .flatMapLatest(files => user.state$.filter(hasID).take(1).map(user => [files,user]))
      .withLatestFrom(collection$, argArray).filter(([x,col]) => _.isUndefined(col.id)).map(([x,col]) => x)
      .map(([f,user]) => ({
        url:'/users/'+user.id+'/collections',
        method: 'POST',
        send: {}
      })),

    // demoAlbum$: DOMactions.demo$.map(x => {
    //   let id = document.getElementById("demo-id").value;
    //   return '/collections/'+id+'/album';
    // }),

    storedAlbum$: DOMactions.hasHash$
      .flatMapLatest(hash => user.state$
          .filter(user => user.id)
          .take(1)
          .map(user => '/users/'+user.id+'/albums/'+ hash))
  }
}


module.exports = function(DOM, HTTP, DOMactions, user, upload) {
  let actions = intent(DOM, HTTP);
  let state$ = model(actions, DOMactions);
  let requests$ = requests(DOMactions, upload, user, state$);

  events(DOMactions, actions);

  return {
    HTTP: requests$,
    state$,
    actions
  }
}
