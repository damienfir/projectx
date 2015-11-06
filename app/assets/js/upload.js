import {Rx} from '@cycle/core';
// import _ from 'underscore';
// import $ from "jquery"
import {apply, argArray, initial} from './helpers'
let Observable = Rx.Observable;


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


module.exports = function(DOMactions, collection) {

  let startUpload$ = Observable.merge(
      DOMactions.selectFiles$.flatMapLatest(files => collection.actions.createdCollection$.map(c => [files,c])),
      DOMactions.selectFiles$.withLatestFrom(collection.state$, argArray).filter(([f,c]) => !_.isUndefined(c.id)));

  let fileUpload$ = startUpload$.flatMap(([files, collection]) =>
      Observable.from(files).flatMap(file => makeUploadRequest(file, collection)).scan((acc,el) => acc.concat(el))).share();

  let uploadedFiles$ = fileUpload$.withLatestFrom(startUpload$,
      (uploaded, [files, collection]) => ({uploaded, files}))
    .filter(({uploaded, files}) => uploaded.length === files.length)
    .map(({uploaded, files}) => uploaded);


  let startedFunc$ = startUpload$.map(([files,collection]) => upload => _.extend(upload, {files: [], size: files.length}));
  let uploadedFunc$ = fileUpload$.map(files => upload => _.extend(upload, {files: files}));
  let finishedFunc$ = uploadedFiles$.map(files => upload => ({}));

  let state$ = Observable.merge(startedFunc$, uploadedFunc$, finishedFunc$)
    .startWith({})
    .scan(apply);

  return {
    actions: {startUpload$, fileUpload$, uploadedFiles$},
    state$
  };
}
