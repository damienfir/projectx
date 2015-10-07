import {Rx,run} from '@cycle/core';
import {makeDOMDriver, h} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import $ from "jquery"
import _ from 'underscore';

import Composition from './composition-ui'
import UI from './ui'
import demo from "./demo"

let Observable = Rx.Observable;

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


function hashMap(photos) {
  return _.object(photos.map(p => [p.id, p.hash]))
}

// function convertToIndices(comp) {
//   comp.tiles = comp.tiles.map((tile, idx) => _.extend(tile, {imgindex: idx}));
//   comp.photos = comp.tiles.map(tile => tile.img);
//   return comp;
// }


// function convertCompositions(comp) {
//   comp.tiles = comp.tiles.map(tile => _.extend(tile, {img: comp.photos[tile.imgindex]}));
//   return comp;
// }


function tileToPhoto(collection) {
  return (tile) => ({id: null, hash: tile.img, collectionID: collection.id});
}

let isNotEmpty = obj => !_.isEmpty(obj)
let asc = (a,b) => a - b
let apply = (state, func) => func(state)
let log = x => console.log(x)
let argArray = (a,b) => [a,b]

function makeUploadRequest(file, collection) {
  var fd = new FormData();
  fd.append("image", file);
  return Observable.fromPromise($.ajax({
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
    gotUser$: jsonGET(/^\/users\/\d+$/),
    createdUser$: jsonPOST(/^\/users$/),
    createdCollection$: jsonPOST(/\/users\/\d+\/collections/),
    createdAlbum$: jsonPOST(/\/collections\/\d+\/pages/),
    downloadedAlbum$: jsonPOST(/\/collections\/\d+\/download/),
    gotDemo$: jsonGET(/\/demo/),
    shuffledPage$: jsonPOST(/^\/collections\/\d+\/page\?/)
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
    ready$: Observable.just({}),
    shuffle$: btn('#shuffle').map(ev => ev.target['data-page'])
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


  const userIDCookie$ = Observable.return(getUserIDFromCookie()).shareReplay(1);

  const userFromHTTP$ = Observable.merge(
      HTTPactions.gotUser$,
      HTTPactions.createdUser$)
    .filter(isNotEmpty).share();


  const demoAlbum$ = DOMactions.demo$.map(x => album => demo.album);
  const demoCollection$ = DOMactions.demo$.map(x => col => demo.collection);

  const userUpdated$ = userFromHTTP$.map(newuser => user => newuser);
  const collectionUpdated$ = HTTPactions.createdCollection$.map(col => collection => col);
  const albumUpdated$ = HTTPactions.createdAlbum$
    .map(newpages => album => album.concat(newpages).sort((a,b) => asc(a.index,b.index)));
  const clearCollection$ = DOMactions.reset$.map(x => item => initial.collection);
  const clearAlbum$ = DOMactions.reset$.map(x => item => initial.album);
  // const shuffleAlbumPage$ = 


  const collectionState$ = Observable.merge(collectionUpdated$, clearCollection$, demoCollection$)
    .startWith(initial.collection)
    .scan(apply)
    .shareReplay(1);

  const albumState$ = Observable.merge(albumUpdated$, clearAlbum$, demoAlbum$, composition$)
    .startWith(initial.album)
    .scan(apply)
    .shareReplay(1);

  const userState$ = Observable.merge(userUpdated$)
    .startWith({})
    .scan(apply)
    .shareReplay(1);
  
  
  const startUpload$ = Observable.merge(
      DOMactions.selectFiles$.flatMapLatest(files => HTTPactions.createdCollection$.map(c => [files,c])),
      DOMactions.selectFiles$.withLatestFrom(collectionState$, argArray).filter(([f,c]) => !_.isUndefined(c.id)))
    .share();

  const fileUpload$ = startUpload$.flatMap(([files, collection]) =>
        Observable.from(files).flatMap(file => makeUploadRequest(file, collection)).scan((acc,el) => acc.concat(el)))
    .share();

  const uploadedFiles$ = fileUpload$.withLatestFrom(startUpload$,
      (uploaded, [files, collection]) => ({uploaded, files}))
    .filter(({uploaded, files}) => uploaded.length === files.length)
    .map(({uploaded, files}) => uploaded);

  const uploadState$ = Observable.merge(
      startUpload$.map(([files,collection]) => upload => _.extend(upload, {files: [], size: files.length})),
      fileUpload$.map(files => upload => _.extend(upload, {files: files})),
      uploadedFiles$.map(files => upload => ({})))
    .startWith({})
    .scan(apply)
    .share();

  const collectionWithPhotos$ = uploadedFiles$.combineLatest(collectionState$, (photos, collection) => _.extend(collection, {photos: hashMap(photos)}));

  const model$ = Observable.combineLatest(
      albumState$, userState$, collectionState$.merge(collectionWithPhotos$), uploadState$,
      (album, user, collection, upload) => ({user, album, collection, upload}))
      .shareReplay(1);


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

    createCollection$: Observable.merge(
        DOMactions.selectFiles$.flatMapLatest(files => userFromHTTP$.map(user => [files,user])),
        DOMactions.selectFiles$.withLatestFrom(userState$, argArray).filter(([f,u]) => !_.isEmpty(u)))
      .withLatestFrom(collectionState$, argArray).filter(([x,col]) => _.isUndefined(col.id)).map(([x,col]) => x)
      .map(([f,user]) => ({
        url:'/users/'+user.id+'/collections',
        method: 'POST',
        send: {}
      })),

    createAlbum$: uploadedFiles$.withLatestFrom(collectionState$, albumState$,
        (photos, collection, album) => ({
          url: '/collections/'+collection.id+'/pages?startindex='+album.length,
          method: 'POST',
          send: photos
        })),

    downloadAlbum$: DOMactions.download$.withLatestFrom(collectionState$, albumState$,
        (x, collection, album) => ({
          url: '/collections/' + collection.id + '/download',
          method: 'POST',
          send: album
        })),

    shufflePage$: DOMactions.shuffle$.withLatestFrom(collectionState$, albumState$,
        (page, collection, album) => ({
          url: '/collections/'+collection.id+'/page?index'+page,
          method: 'POST',
          send: album[page].map(tileToPhoto(collection))
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
  
  var state$ = model$.combineLatest(uiState$, (state, ui) => _.extend(state, {ui}));
  
  let requests$ = Observable.merge(_.values(requests));

  return {
    DOM: UI.view(state$),
    HTTP: requests$
  };
}


run(main, {
  DOM: makeDOMDriver('#app'),
  HTTP: makeHTTPDriver()
});
