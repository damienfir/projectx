import Rx from 'rx';
import {h} from '@cycle/dom';
import helpers from './helpers'


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


function intent(DOM, DOMactions, collection) {
  let startUpload$ = DOMactions.selectFiles$
    .flatMapLatest(files => collection.state$.filter(helpers.hasID)
        .take(1)
        .map(c => [files, c]));

  let fileUpload$ = startUpload$.flatMap(([files, collection]) =>
      Rx.Observable.from(files)
        .flatMap(file => makeUploadRequest(file, collection))
        .scan((acc,el) => acc.concat(el)))
      .share();

  let uploadedFiles$ = fileUpload$.withLatestFrom(startUpload$,
      (uploaded, [files, collection]) => ({uploaded, files}))
    .filter(({uploaded, files}) => uploaded.length === files.length)
    .map(({uploaded, files}) => uploaded);

  return {startUpload$, fileUpload$, uploadedFiles$};
}


function model(actions, DOMactions) {

  let startedFunc$ = actions.startUpload$.map(([files,collection]) =>
      upload => _.extend(upload, {files: [], size: files.length}));

  let uploadedFunc$ = actions.fileUpload$.map(files =>
      upload => _.extend(upload, {files: files}));

  let finishedFunc$ = actions.uploadedFiles$.map(files =>
      upload => ({}));

  return Rx.Observable.merge(startedFunc$, uploadedFunc$, finishedFunc$)
    .startWith({})
    .scan(helpers.apply);
}


function view(state$) {
  return state$.map(state =>
      h('.modal.fade#upload-modal',
      h('.modal-dialog',
        h('.modal-content#upload-area',
          h('.modal-body', [h('.message', "Drag to upload or click here"), h('.fa.fa-download.fa-3x')]))))
  );
}


module.exports = function(DOM, DOMactions, collection) {
  let actions = intent(DOM, DOMactions, collection);
  let state$ = model(actions);

  return {
    DOM: view(state$),
    actions,
    state$
  };
}
