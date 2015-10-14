import {Rx} from '@cycle/core';
import _ from 'underscore';
import {apply,initial} from './helpers'
import demo from "./demo"
let Observable = Rx.Observable;


module.exports = function(DOMactions, upload) {
    let demoPhotos$ = DOMactions.demo$.map(x => y => demo.collection.photos);
    let newPhotos$ = upload.actions.uploadedFiles$.map(files => photos => photos.concat(files));
    let clearPhotos$ = DOMactions.reset$.map(x => y => []);

    let state$ = Observable.merge(newPhotos$, clearPhotos$, demoPhotos$)
      .startWith(initial.photos)
      .scan(apply);

    return {
      state$
    };
}
