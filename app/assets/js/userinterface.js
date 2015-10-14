import {Rx} from '@cycle/core';
import {apply, argArray, initial, UI} from './helpers'
import _ from 'underscore';
let Observable = Rx.Observable;


module.exports = function(DOMactions, album) {

  function model(DOMactions, album) {
    let uploadBox$ = DOMactions.toggleUpload$.map(f => ui => ui ^ UI.uploadBox);
    let uploading$ = DOMactions.selectFiles$.map(f => ui => (ui | UI.uploading) & ~UI.processing);
    let processing$ = album.HTTP.createAlbum$.map(f => ui => (ui ^ UI.processing) & ~UI.uploading);
    let complete$ = album.actions.createdAlbum$.map(f => ui => ui & ~(UI.uploading | UI.processing | UI.uploadBox));

    let state$ = Observable.merge(uploadBox$, uploading$, processing$, complete$)
      .startWith(initial.ui)
      .scan(apply)
      .shareReplay(1);

    return state$;
  }

  let state$ = model(DOMactions, album);

  return {state$}
}
