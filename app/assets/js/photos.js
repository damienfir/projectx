import Rx from 'rx';
import {apply,initial} from './helpers'
let Observable = Rx.Observable;


module.exports = function(DOMactions, upload, collection) {
    let demoPhotos$ = collection.actions.storedAlbum$.map(demo => y => demo.photos);
    let newPhotos$ = upload.actions.uploadedFiles$.map(files => photos => photos.concat(files));
    let clearPhotos$ = DOMactions.reset$.map(x => y => []);

    let state$ = Observable.merge(newPhotos$, clearPhotos$, demoPhotos$)
      .startWith(initial.photos)
      .scan(apply);

    return {
      state$
    };
}
