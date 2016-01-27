import Rx from 'rx';
import {apply,initial} from './helpers'
let Observable = Rx.Observable;


module.exports = function(DOMactions, upload, collection) {
    let actions = {
      uploadedPhoto$: new Rx.Subject()
    }
    
    let demoPhotos$ = collection.actions.storedAlbum$.map(demo => y => demo.photos);
    let newPhotos$ = actions.uploadedPhoto$.map(file => photos => photos.concat(file));
    let clearPhotos$ = DOMactions.reset$.map(x => y => []);

    let state$ = Observable.merge(newPhotos$, clearPhotos$, demoPhotos$)
      .startWith(initial.photos)
      .scan(apply)
      // .do(x => console.log(x));

    return {
      actions,
      state$
    };
}
