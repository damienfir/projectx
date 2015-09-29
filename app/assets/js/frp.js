import {Rx,run} from '@cycle/core';
import {makeDOMDriver, h} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import $ from "jquery"
import _ from 'underscore';

import Composition from './composition-ui'
import UI from './ui'
import TestData from "./data"


var initial = {
  user: {},
  collection: {},
  album: []
};


function toArray(filelist) {
  var list = [];
  for (var i = 0; i < filelist.length; i++) list.push(filelist[i]);
  return list;
}

function convertToIndices(comp) {
  comp.tiles = comp.tiles.map((tile, idx) => _.extend(tile, {imgindex: idx}));
  comp.photos = comp.tiles.map(tile => tile.img);
  return comp;
}


function convertCompositions(comp) {
  comp.tiles = comp.tiles.map(tile => _.extend(tile, {img: comp.photos[tile.imgindex]}));
  return comp;
}

function makeUploadRequest(file, collection) {
  var fd = new FormData();
  fd.append("image", file);
  return Rx.Observable.fromPromise($.ajax({
    url: "/collections/"+collection.id+"/photos",
    method: 'POST',
    data: fd,
    processData: false,
    contentType: false
  }));
}


function HTTPintent(HTTP) {
  let jsonGET = (regex) =>
    HTTP.filter(res$ => res$.request.method === undefined)
      .filter(res$ => res$.request.match(regex))
      .mergeAll().map(res => res.body).share();

  let jsonPOST = (regex) =>
    HTTP.filter(res$ => res$.request.method === 'POST')
      .filter(res$ => res$.request.url.match(regex))
      .mergeAll().map(res => res.body).share();

  return {
    gotUser$: jsonGET(/\/users\/\d+/),
    createdUser$: jsonPOST(/\/users/),
    createdCollection$: jsonPOST(/\/users\/\d+\/collections/),
    createdAlbum$: jsonPOST(/\/collections\/\d+\/pages/),
    downloadedAlbum$: jsonPOST(/\/collections\/\d+\/download/),
    gotDemo$: jsonGET(/\/demo/)
  }
}


function DOMintent(DOM) {
  let cancelDefault = (ev) => { ev.preventDefault(); ev.stopPropagation(); return ev; }
  let btn = (selector) => DOM.select(selector).events('click').map(cancelDefault)

  btn('#upload-area').subscribe(_ => 
      document.getElementById('file-input').dispatchEvent(new MouseEvent('click')));

  return {
    toggleUpload$: btn('#upload-btn').merge(btn('#create-btn')),
    selectFiles$: DOM.select('#file-input').events('change').map(ev => toArray(ev.target.files)).share(),
    reset$: btn('#reset-btn'),
    download$: btn('#download-btn'),
    demo$: btn('#demo-btn'),
    ready$: Rx.Observable.just({})
  }
}



function getUserIDFromCookie(key) {
  return 1;
}


function model(DOMactions, HTTPactions, composition$) {

  HTTPactions.downloadedAlbum$.subscribe(url => {
    window.location.href = "/storage/generated/" + url;
  });


  // collection
  // const uploadStarted$ = actions.requests.startUpload$.map(([files, col]) => collection =>
  //     _.extend(collection, _.extend(col, {nphotos: files.length, photos: []})));
  // const fileAdded$ = actions.requests.uploadFile$.map(f => collection => {
  //   collection.photos.push(f);
  //   return collection;
  // });


  const userIDCookie$ = Rx.Observable.return(getUserIDFromCookie()).share();

  const user$ = Rx.Observable.merge(
      HTTPactions.gotUser$,
      HTTPactions.createdUser$)
    .filter(user => !_.isEmpty(user)).share();



  const userUpdated$ = user$.map(newuser => user => newuser);

  const albumUpdated$ = HTTPactions.createdAlbum$
    .merge(HTTPactions.gotDemo$)
    .map(newpages => album => album.concat(newpages.map(convertCompositions)).sort((a,b) => b.index-a.index));

  const clearAll$ = DOMactions.reset$.map(x => item => []);


  const collectionState$ = Rx.Observable.merge(clearAll$)
    .startWith(initial.collection)
    .scan((collection, func) => func(collection));

  const albumState$ = Rx.Observable.merge(albumUpdated$, clearAll$, composition$)
    .startWith(initial.album.map(convertCompositions))
    .scan((album, func) => func(album));

  const userState$ = Rx.Observable.merge(userUpdated$)
    .startWith({})
    .scan((user, func) => func(user));

  const model$ = Rx.Observable.combineLatest(
      albumState$, userState$, collectionState$,
      (album, user, collection) => ({user, album, collection}))
      .share();
  
  
  const startUpload$ = Rx.Observable.merge(
      DOMactions.selectFiles$.zip(HTTPactions.createdCollection$),
      DOMactions.selectFiles$.withLatestFrom(collectionState$.filter(col => !_.isEmpty(col))));

  const uploadFile$ = startUpload$.flatMap(([files, collection]) =>
        Rx.Observable.from(files).flatMap(file => makeUploadRequest(file, collection))
        .concat(Rx.Observable.return('end'))).share();

  const uploadEnd$ = uploadFile$.filter(x => x === 'end');


  const requests = {
    getUser$: userIDCookie$.filter(x => x)
      .zip(DOMactions.selectFiles$.first())
      .map(([id,files]) => '/users/'+id),

    createUser$: userIDCookie$.filter(x => !x)
      .zip(DOMactions.selectFiles$.first())
      .map(x => ({
        method: 'POST',
        url: '/users',
        send: {}
      })),

    createCollection$: Rx.Observable.merge(
        DOMactions.selectFiles$.zip(user$),
        DOMactions.selectFiles$.withLatestFrom(userState$.filter(user => !_.isEmpty(user))))
      .withLatestFrom(collectionState$).filter(([x,col]) => _.isEmpty(col)).map(([x,col]) => x)
      .map(([f,user]) => ({
        url:'/users/'+user.id+'/collections',
        method: 'POST',
        send: {}
      })),

    createAlbum$: uploadEnd$.withLatestFrom(collectionState$,
        (x, collection) => ({
          url: '/collections/'+collection.id+'/pages',
          method: 'POST',
          send: {}
        })),

    downloadAlbum$: DOMactions.download$.withLatestFrom(collectionState$, albumState$,
        (x, collection, album) => ({
          url: '/collections/' + collection.id + '/download',
          method: 'POST',
          send: album.map(convertToIndices)
        }))
  };

  return {model$, requests};
}


function main({DOM, HTTP}) {
  let HTTPactions = HTTPintent(HTTP);
  let DOMactions = DOMintent(DOM);
  let composition$ = Composition.state(DOM);

  let {model$, requests} = model(DOMactions, HTTPactions, composition$);

  let uiState$ = UI.model(DOMactions, HTTPactions, requests);
  
  var state$ = model$.combineLatest(uiState$, (state, ui) => _.extend(state, {ui})).do(x => console.log(x));
  
  let requests$ = Rx.Observable.merge(_.values(requests)).do(x => console.log(x));

  return {
    DOM: UI.view(state$),
    HTTP: requests$
  };
}


run(main, {
  DOM: makeDOMDriver('#app'),
  HTTP: makeHTTPDriver()
});
