import Cycle from '@cycle/core';
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

function makeUploadRequest(file, collection) {
  var fd = new FormData();
  fd.append("image", file);
  return Cycle.Rx.Observable.fromPromise($.ajax({
    url: "/collections/"+collection.id+"/photos",
    method: 'POST',
    data: fd,
    processData: false,
    contentType: false
  }));
}


function cancelDefault(ev) {
  ev.preventDefault();
  ev.stopPropagation();
  return ev;
}


function backendIntent(HTTP) {
  function jsonGET(regex) {
    return HTTP.filter(res$ => res$.request.method === undefined)
      .filter(res$ => res$.request.match(regex))
      .mergeAll().map(res => res.body).share();
  }

  function jsonPOST(regex) {
    return HTTP.filter(res$ => res$.request.method === 'POST')
      .filter(res$ => res$.request.url.match(regex))
      .mergeAll().map(res => res.body).share();
  }

  var getUser$ = jsonGET(/\/users\/\d+/);
  var createCollection$ = jsonPOST(/\/users\/\d+\/collections/);
  var createComposition$ = jsonPOST(/\/collections\/\d+\/pages/);
  var downloadAlbum$ = jsonPOST(/\/collections\/\d+\/download/);
  var getDemo$ = jsonGET(/\/demo/);

  return {
    getUser$,
    createCollection$,
    createComposition$,
    downloadAlbum$,
    getDemo$
  }
}

function intent(DOM, responses) {
  let toggleUpload$ = DOM.select('#upload-btn').events('click').map(cancelDefault)
    .merge(DOM.select('#create-btn').events('click').map(cancelDefault)).share();
  let btn$ = DOM.select('#upload-area').events('click').share();
  btn$.subscribe(_ => document.getElementById('file-input').dispatchEvent(new MouseEvent('click')));
  var selectFiles$ = DOM.select('#file-input').events('change').map(ev => toArray(ev.target.files)).share();
  var reset$ = DOM.select('#reset-btn').events('click').share();
  var demo$ = DOM.select('#demo-btn').events('click');
  var download$ = DOM.select('#download-btn').events('click').share();

  var startUpload$ = selectFiles$.zip(responses.createCollection$).share();
  var uploadFile$ = startUpload$.flatMap(([files, collection]) =>
        Cycle.Rx.Observable.from(files).flatMap(file => makeUploadRequest(file, collection))
        .concat(Cycle.Rx.Observable.return('end'))).share();

  return {
    toggleUpload$,
    selectFiles$,
    reset$,
    download$,
    demo$,
    requests: {
      startUpload$,
      uploadFile$
    },
    responses
  };
}


function requests(actions) {
  var responses = actions.responses;
  var getUser$ = actions.selectFiles$.map(f => state => '/users/1');
  var createCollection$ = responses.getUser$.zip(actions.selectFiles$,
      (user, x) => state => ({url:'/users/'+user.id+'/collections', method: 'POST', send: {}}));
  var createComposition$ = responses.createCollection$.zip(actions.requests.uploadFile$.filter(x => x === 'end'),
      (collection, _) => state => ({url: '/collections/'+collection.id+'/pages', method: 'POST', send: {}}));

  var downloadAlbum$ = actions.download$.map(ev => state => {
    return {url: '/collections/' + state.collection.id + '/download', method: 'POST', send: state.album.map(convertToIndices)};
  });

  var getDemo$ = actions.demo$.map(ev => state => '/demo');

  return {
    getUser$,
    createCollection$,
    createComposition$,
    downloadAlbum$,
    getDemo$
  };
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

function albumModel(actions, compositionState$) {
  var clearState$ = actions.reset$.map(x => album => []);
  var albumState$ = actions.responses.createComposition$
    .merge(actions.responses.getDemo$)
    .map(compositions => album => compositions.map(convertCompositions));

  actions.responses.downloadAlbum$.subscribe(url => {
    window.location.href = "/storage/generated/" + url;
  });

  return Cycle.Rx.Observable.merge(albumState$, clearState$, compositionState$)
    .startWith(initial.album.map(convertCompositions))
    .scan((album, func) => func(album));
}

function collectionModel(actions) {
  let uploadStarted$ = actions.requests.startUpload$.map(([files, col]) => collection =>
      _.extend(collection, _.extend(col, {nphotos: files.length, photos: []})));
  let fileAdded$ = actions.requests.uploadFile$.map(f => collection => {
    collection.photos.push(f);
    return collection;
  });

  return Cycle.Rx.Observable.merge(uploadStarted$, fileAdded$)
    .startWith(initial.collection)
    .scan((collection, func) => func(collection));
}


function main({DOM, HTTP}) {
  let actions = intent(DOM, backendIntent(HTTP));
  let compositionState$ = Composition.state(DOM);

  let requestsActions = requests(actions);

  var state$ = UI.model(actions, requestsActions).combineLatest(
        albumModel(actions, compositionState$),
        actions.responses.getUser$.startWith({}),
        collectionModel(actions),
      (ui, album, user, collection) => ({user, album, collection, ui}))
      .share();
  
  let requests$ = Cycle.Rx.Observable.merge(_.values(requestsActions));

  return {
    DOM: UI.view(state$),
    HTTP: requests$.withLatestFrom(state$, (func, state) => func(state))
  };
}


Cycle.run(main, {
  DOM: makeDOMDriver('#app'),
  HTTP: makeHTTPDriver()
});
