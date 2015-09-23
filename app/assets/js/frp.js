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


function renderUpload() {
  return <div className="upload-box">
    <button className="btn btn-primary" id="upload-btn"><i className="fa fa-upload"></i>&nbsp; Upload photos</button>
    <button className="btn btn-default" id="reset-btn">Reset</button>
    <input type="file" name="image" id="file-input" multiple></input>
  </div>
}


function intent(DOM, HTTP) {
  let btn$ = DOM.select('#upload-btn').events('click');
  btn$.subscribe(_ => document.getElementById('file-input').dispatchEvent(new MouseEvent('click')));
  var uploadFiles$ = DOM.select('#file-input').events('change').map(ev => toArray(ev.target.files)).share();
  var reset$ = DOM.select('#reset-btn').events('click');
  
  // var albumUpload$ = uploadFiles$.flatMap(files => Cycle.Rx.Observable.from(divideArray(files, 3))).shareReplay(10);

  var getResponses$ = HTTP.filter(res$ => res$.request.method === undefined);
  var postResponses$ = HTTP.filter(res$ => res$.request.method === 'POST');

  var userResponse$ = getResponses$.filter(res$ => res$.request.match(/\/users\/\d+/)).mergeAll().map(res => res.body).share();
  var collectionResponse$ = postResponses$.filter(res$ => res$.request.url.match(/\/users\/\d+\/collections/)).mergeAll()
    .map(res => res.body).share();
  var compositionResponse$ = postResponses$.filter(res$ => res$.request.url.match(/\/collections\/\d+\/pages/)).mergeAll()
    .map(res => res.body).share();

  return {
    uploadFiles$,
    // albumUpload$,
    reset$,
    userResponse$,
    collectionResponse$,
    compositionResponse$
  };
}


function requests(actions) {
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

  return Cycle.Rx.Observable.merge(
    userRequest$,
    collectionRequest$,
    compositionRequest$
  );
}


function model(actions) {
  var clearState$ = actions.reset$.map(x => album => []);
  var albumState$ = actions.compositionResponse$.map(compositions => album => compositions)
  return Cycle.Rx.Observable.merge(albumState$, clearState$);
}


function view(state$) {
  return state$.map(state => 
      <div className="container-ui limited-width">
        {renderUpload()}
        {Composition.view(state.album)}
      </div>
  );
}


function main({DOM, HTTP}) {
  let actions = intent(DOM, HTTP);
  let requests$ = requests(actions);
  let albumState$ = model(actions);
  let compositionState$ = Composition.model(Composition.intent(DOM));

  var state$ = Cycle.Rx.Observable
    .merge(albumState$, compositionState$)
    .startWith([TestData])
    .scan((album, func) => func(album))
    .map(album => ({album}));

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
