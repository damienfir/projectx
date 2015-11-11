import Rx from 'rx';
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


module.exports = function(DOMactions, collection) {

  let startUpload$ = DOMactions.selectFiles$
    .flatMapLatest(files => collection.state$.filter(helpers.hasID)
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


  let startedFunc$ = startUpload$.map(([files,collection]) =>
      upload => _.extend(upload, {files: [], size: files.length}));

  let uploadedFunc$ = fileUpload$.map(files =>
      upload => _.extend(upload, {files: files}));

  let finishedFunc$ = uploadedFiles$.map(files =>
      upload => ({}));

  let state$ = Rx.Observable.merge(startedFunc$, uploadedFunc$, finishedFunc$).startWith({}).scan(helpers.apply);

  return {
    actions: {startUpload$, fileUpload$, uploadedFiles$},
    state$
  };
}
