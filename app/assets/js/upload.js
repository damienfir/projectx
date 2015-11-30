import Rx from 'rx';
import Immutable from 'immutable';
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
  helpers.btn(DOM, '#upload-area').subscribe(_ => 
      document.getElementById('file-input').dispatchEvent(new MouseEvent('click')));

  DOM.select('#upload-area').events('dragover')
    .map(helpers.cancel)
    .subscribe(ev => {ev.dataTransfer.dropEffect = 'copy'; return ev;});

  let toggleUpload$ = helpers.btn(DOM, '#upload-btn').merge(helpers.btn(DOM, '#create-btn'));

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

  return {toggleUpload$, startUpload$, fileUpload$, uploadedFiles$};
}


function events(DOMactions, actions) {
  actions.toggleUpload$.subscribe(ev => $('#upload-modal').modal('show'));
  DOMactions.selectFiles$.subscribe(x => $('#upload-modal').modal('hide'));
}


let initial = Immutable.Map({photos: Immutable.List(), size: 0});

function model(actions, DOMactions) {

  let startedFunc$ = actions.startUpload$.map(([files,collection]) =>
      upload => upload.set('size', files.length));

  let uploadedFunc$ = actions.fileUpload$
    .map(files => upload => upload.set('photos', Immutable.fromJS(files)));

  // let uploadedFunc$ = actions.fileUpload$
  //   .bufferWithCount(npics)
  //   .merge(actions.fileUpload$.take(1).map(f => [f]))
  //   .merge(actions.uploadedFiles$
  //       .filter(f => f.length < npics)
  //       .map(files => files.slice(-(files.length % npics))))
  //   .map(files => upload => upload.updateIn('photos', v => v.push(files)));

  let finishedFunc$ = actions.uploadedFiles$.map(files =>
      upload => upload.set('size', 0));

  return Rx.Observable.merge(startedFunc$, uploadedFunc$, finishedFunc$)
    .startWith(initial)
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

  events(DOMactions, actions)

  return {
    DOM: view(state$),
    actions,
    state$
  };
}
