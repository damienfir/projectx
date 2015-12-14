import Rx from 'rx';
import Immutable from 'immutable';
import {h} from '@cycle/dom';
import helpers from './helpers'
import i18 from './i18n'


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

  let toggleUpload$ = helpers.btn(DOM, '#upload-btn')
    .merge(helpers.btn(DOM, '#create-btn'))
    .merge(helpers.btn(DOM, '#addmore-btn'));

  let startUpload$ = DOMactions.selectFiles$
    .flatMapLatest(files => collection.state$.filter(helpers.hasID)
        .take(1)
        .map(c => [files, c]))
    .share();

  startUpload$.subscribe(ev => {
    $('#album-title').focus();
    // if ($('#step2').offset()) {
    // $('html,body').animate({
    //   scrollTop: $('#step2').offset().top
    // }, 1000)
    // }
  });

  let fileUpload$ = startUpload$.flatMapLatest(([files, collection]) =>
      Rx.Observable.from(files)
        .scan((acc,el) => acc.concat(el), []))
      .publish();

  let uploadedFiles$ = fileUpload$.withLatestFrom(startUpload$,
      (uploaded, [files, collection]) => ({uploaded, files}))
    .filter(({uploaded, files}) => uploaded.length === files.length)
    .map(({uploaded, files}) => uploaded);

  let uploaded$ = new Rx.Subject();
  let finished$ = new Rx.Subject();

  return {toggleUpload$, startUpload$, fileUpload$, uploadedFiles$, uploaded$, finished$};
}


function events(DOMactions, actions) {
  actions.toggleUpload$.subscribe(ev => $('#upload-modal').modal('show'));
  DOMactions.selectFiles$.subscribe(x => $('#upload-modal').modal('hide'));
}


let initial = Immutable.fromJS({'files': [], 'size': 0});

function model(actions, DOMactions) {

  let startedFunc$ = actions.startUpload$.map(([files,collection]) =>
      upload => upload.set('size', files.length));

  let uploadedFunc$ = actions.uploaded$.map(photo =>
      upload => upload.update('files', Immutable.List(), f => f.push(photo)));

  // let finishedFunc$ = actions.finished$.map(files =>
  //     upload => initial);

  return Rx.Observable.merge(
      startedFunc$,
      // uploadedFunc$,
      uploadedFunc$
      // finishedFunc$
    )
    .startWith(initial)
    .scan(helpers.apply);
}


function view(state$) {
  return state$.map(state =>
      h('.modal.fade#upload-modal',
      h('.modal-dialog',
        h('.modal-content#upload-area',
          h('.modal-body', [h('.message', i18('upload.dragclick')), h('.fa.fa-download.fa-3x')]))))
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
