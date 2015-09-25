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
  album: TestData
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



function intent(DOM, HTTP) {
  let toggleUpload$ = DOM.select('#upload-btn').events('click').share();
  let btn$ = DOM.select('#upload-area').events('click').share();
  btn$.subscribe(_ => document.getElementById('file-input').dispatchEvent(new MouseEvent('click')));
  var uploadFiles$ = DOM.select('#file-input').events('change').map(ev => toArray(ev.target.files)).share();
  var reset$ = DOM.select('#reset-btn').events('click').share();
  var download$ = DOM.select('#download-btn').events('click').share();

  var getResponses$ = HTTP.filter(res$ => res$.request.method === undefined);
  var postResponses$ = HTTP.filter(res$ => res$.request.method === 'POST');

  var userResponse$ = getResponses$.filter(res$ => res$.request.match(/\/users\/\d+/)).mergeAll().map(res => res.body).share();
  var collectionResponse$ = postResponses$.filter(res$ => res$.request.url.match(/\/users\/\d+\/collections/)).mergeAll()
    .map(res => res.body).share();
  var compositionResponse$ = postResponses$.filter(res$ => res$.request.url.match(/\/collections\/\d+\/pages/)).mergeAll()
    .map(res => res.body).share();
  var downloadResponse$ = postResponses$.filter(res$ => res$.request.url.match(/\/collections\/\d+\/download/)).mergeAll()
    .map(res => res.body).share();

  var uploadRequest$ = uploadFiles$.zip(collectionResponse$).share();
  var fileUploadRequest$ = uploadRequest$.flatMap(([files, collection]) =>
        Cycle.Rx.Observable.from(files).flatMap(file => makeUploadRequest(file, collection))
        .concat(Cycle.Rx.Observable.return('end'))).share();

  return {
    toggleUpload$,
    uploadFiles$,
    reset$,
    download$,
    userResponse$,
    collectionResponse$,
    compositionResponse$,
    downloadResponse$,
    uploadRequest$,
    fileUploadRequest$
  };
}


function requests(actions) {
  var userRequest$ = actions.uploadFiles$.map(f => state => '/users/1');
  var collectionRequest$ = actions.userResponse$.zip(actions.uploadFiles$,
      (user, x) => state => ({url:'/users/'+user.id+'/collections', method: 'POST', send: {}}));
  var compositionRequest$ = actions.collectionResponse$.zip(actions.fileUploadRequest$.filter(x => x === 'end'),
      (collection, _) => state => ({url: '/collections/'+collection.id+'/pages', method: 'POST', send: {}}));

  var downloadRequest$ = actions.download$.map(ev => state => {
    return {url: '/collections/' + state.collection.id + '/download', method: 'POST', send: state.album.map(convertToIndices)};
  });

  return {
    userRequest$,
    collectionRequest$,
    compositionRequest$,
    downloadRequest$
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
  var albumState$ = actions.compositionResponse$.map(compositions => album => compositions.map(convertCompositions));

  actions.downloadResponse$.subscribe(url => {
    window.location.href = "/storage/generated/" + url;
  });

  return Cycle.Rx.Observable.merge(albumState$, clearState$, compositionState$)
    .startWith(initial.album.map(convertCompositions))
    .scan((album, func) => func(album));
}

function collectionModel(actions) {
  let uploadStarted$ = actions.uploadRequest$.map(([files, col]) => collection =>
      _.extend(collection, _.extend(col, {nphotos: files.length})));
  let fileAdded$ = actions.fileUploadRequest$.map(f => collection => {
    if (collection.photos) {
      collection.photos.push(f);
    } else {
      collection.photos = [f];
    }
    return collection;
  });

  return Cycle.Rx.Observable.merge(uploadStarted$, fileAdded$)
    .startWith(initial.collection)
    .scan((collection, func) => func(collection));
}


function main({DOM, HTTP}) {
  let actions = intent(DOM, HTTP);
  let compositionState$ = Composition.model(Composition.intent(DOM));

  let requestsActions = requests(actions);

  var state$ = UI.model(actions, requestsActions).combineLatest(
        albumModel(actions, compositionState$),
        actions.userResponse$.startWith({}),
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
