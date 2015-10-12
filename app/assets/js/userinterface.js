import {Rx} from '@cycle/core';
import {apply, argArray, initial} from './helpers'
import UI from './ui'
import _ from 'underscore';
let Observable = Rx.Observable;


module.exports = function(DOMactions, album) {

  function model(DOMactions, album) {
    let uploadBox$ = DOMactions.toggleUpload$.map(f => ui => ui ^ UI.UI.uploadBox);
    let uploading$ = DOMactions.selectFiles$.map(f => ui => (ui ^ UI.UI.uploading) & ~UI.UI.processing);
    let processing$ = album.HTTP.createAlbum$.map(f => ui => (ui ^ UI.UI.processing) & ~UI.UI.uploading);
    let complete$ = album.actions.createdAlbum$.map(f => ui => ui & ~(UI.UI.uploading | UI.UI.processing | UI.UI.uploadBox));

    let state$ = Observable.merge(uploadBox$, uploading$, processing$, complete$)
      .startWith(UI.UI.initial)
      .scan(apply)
      .shareReplay(1);

    return state$;
  }

  let state$ = model(DOMactions, album);

  return {state$}
}
