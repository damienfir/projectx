/** @jsx hJSX */

import Cycle from '@cycle/core';
import {makeDOMDriver, hJSX} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import $ from "jquery"
import _ from 'underscore';

import Composition from './composition-ui'
import TestData from "./data"


function initial() {
  // return TestData;
  return [TestData, TestData, TestData];
}

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


function renderToolbar() {
  return <div className="upload-box">
    <button className="btn btn-primary" id="upload-btn"><i className="fa fa-upload"></i>&nbsp; Upload photos</button>
    <button className="btn btn-default" id="reset-btn">Reset</button>
    <button className="btn btn-primary" id="download-btn">Download</button>
    <input type="file" name="image" id="file-input" multiple></input>
  </div>
}


function intent(DOM, HTTP) {
  let btn$ = DOM.select('#upload-btn').events('click');
  btn$.subscribe(_ => document.getElementById('file-input').dispatchEvent(new MouseEvent('click')));
  var uploadFiles$ = DOM.select('#file-input').events('change').map(ev => toArray(ev.target.files)).share();
  var reset$ = DOM.select('#reset-btn').events('click');
  var download$ = DOM.select('#download-btn').events('click');
  
  // var albumUpload$ = uploadFiles$.flatMap(files => Cycle.Rx.Observable.from(divideArray(files, 3))).shareReplay(10);

  var getResponses$ = HTTP.filter(res$ => res$.request.method === undefined);
  var postResponses$ = HTTP.filter(res$ => res$.request.method === 'POST');

  var userResponse$ = getResponses$.filter(res$ => res$.request.match(/\/users\/\d+/)).mergeAll().map(res => res.body).share();
  var collectionResponse$ = postResponses$.filter(res$ => res$.request.url.match(/\/users\/\d+\/collections/)).mergeAll()
    .map(res => res.body).share();
  var compositionResponse$ = postResponses$.filter(res$ => res$.request.url.match(/\/collections\/\d+\/pages/)).mergeAll()
    .map(res => res.body).share();

  var downloadResponse$ = postResponses.filter(res$ => res$.request.url.match(/\user\/\d+\/download/)).mergeAll().map(res => res.body).share().do(x => console.log(x));

  return {
    uploadFiles$,
    reset$,
    download$,
    userResponse$,
    collectionResponse$,
    compositionResponse$,
    downloadResponse$
  };
}


function requests(actions, state$) {
  var userRequest$ = actions.uploadFiles$.map(f => '/users/1');
  var collectionRequest$ = actions.userResponse$.zip(actions.uploadFiles$,
      (user, x) => ({url:'/users/'+user.id+'/collections', method: 'POST', send: {}}));
  var fileUploadRequest$ = actions.uploadFiles$
    .zip(actions.collectionResponse$)
    .flatMap(([files, collection]) =>
        Cycle.Rx.Observable.from(files).flatMap(file => makeUploadRequest(file, collection))
        .concat(Cycle.Rx.Observable.return('end')));
  var compositionRequest$ = actions.collectionResponse$.zip(fileUploadRequest$.filter(x => x === 'end'),
      (collection, _) => ({url: '/collections/'+collection.id+'/pages', method: 'POST', send: {}}));

  var downloadRequest$ = actions.download$.withLatestFrom(state$, (ev, state) => {
    return {url: '/user/' + state.user.id + '/download', method: 'POST', send: state.album.map(convertToIndices)};
  }).do(x => console.log(x));

  return Cycle.Rx.Observable.merge(
    userRequest$,
    collectionRequest$,
    compositionRequest$,
    downloadRequest$
  );
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

function model(actions) {
  var clearState$ = actions.reset$.map(x => album => []);
  var albumState$ = actions.compositionResponse$.map(compositions => album => compositions.map(convertCompositions))
  return Cycle.Rx.Observable.merge(albumState$, clearState$);
}


function view(state$) {
  return state$.map(state => 
      <div className="container-ui limited-width">
        {renderToolbar()}
        {Composition.view(state.album)}
      </div>
  );
}


function main({DOM, HTTP}) {
  let actions = intent(DOM, HTTP);
  let albumState$ = model(actions);
  let compositionState$ = Composition.model(Composition.intent(DOM));

  var state$ = Cycle.Rx.Observable
    .merge(albumState$, compositionState$)
    .startWith(TestData.map(convertCompositions))
    .scan((album, func) => func(album))
    .combineLatest(actions.userResponse$, (album, user) => ({user, album}));

  let requests$ = requests(actions, state$);

  var vtree$ = view(state$);
  
  return {
    DOM: vtree$,
    HTTP: requests$
  };
}


Cycle.run(main, {
  DOM: makeDOMDriver('#app'),
  HTTP: makeHTTPDriver()
});
