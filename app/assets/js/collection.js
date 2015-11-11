import Rx from 'rx';
import {apply, argArray, initial, jsonPOST, jsonGET, hasID} from './helpers'
let Observable = Rx.Observable;


function intent(HTTP) {
  return {
    createdCollection$: jsonPOST(HTTP, /\/users\/\d+\/collections/),
    storedAlbum$: jsonGET(HTTP, /\/collections\/\d+\/album/)
  }
}


function model(HTTPactions, DOMactions) {
  let demoCollection$ = HTTPactions.storedAlbum$.map(demo => col => demo.collection);
  let collectionUpdated$ = HTTPactions.createdCollection$.map(col => collection => col);
  let clearCollection$ = DOMactions.reset$.map(x => item => initial.collection);
  let collectionName$ = DOMactions.albumTitle$.map(name => collection => _.extend(collection, {name: name}))
  HTTPactions.createdCollection$.merge(HTTPactions.storedAlbum$.map(d => d.collection)).subscribe(col => window.history.pushState({}, '', '/ui/'+col.id));
  DOMactions.reset$.subscribe(x => window.history.pushState({}, '', '/ui'));

  return Observable.merge(
      collectionUpdated$,
      clearCollection$,
      demoCollection$,
      collectionName$)
    .startWith(initial.collection)
    .scan(apply)
    .shareReplay(1);
}


function requests(DOMactions, userState$, state$) {
  return {
    createCollection$: DOMactions.selectFiles$
      .flatMapLatest(files => userState$.filter(hasID).map(user => [files,user]))
      .withLatestFrom(state$, argArray).filter(([x,col]) => _.isUndefined(col.id)).map(([x,col]) => x)
      .map(([f,user]) => ({
        url:'/users/'+user.id+'/collections',
        method: 'POST',
        send: {}
      })),

    demoAlbum$: DOMactions.demo$.map(x => {
      let id = document.getElementById("demo-id").value;
      return '/collections/'+id+'/album';
    }),

    storedAlbum$: DOMactions.hasID$.map(id => '/collections/'+id+'/album')
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
