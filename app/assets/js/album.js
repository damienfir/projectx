import {Rx} from '@cycle/core';
import {h} from '@cycle/dom';
import _ from 'underscore';
import demo from "./demo"
import {apply, argArray, asc, initial, jsonPOST} from './helpers'
import Composition from './composition-ui'
import UI from './ui'
let Observable = Rx.Observable;


function intent(HTTP) {
  return {
    createdAlbum$: jsonPOST(HTTP, /\/collections\/\d+\/pages\?startindex=.*/),
    downloadedAlbum$: jsonPOST(HTTP, /\/collections\/\d+\/download/),
    shuffledPage$: jsonPOST(HTTP, /\/collections\/\d+\/page\?index=.*/)
  }
}


function model(DOMactions, HTTPactions, composition$) {
  HTTPactions.downloadedAlbum$.subscribe(url => {
    window.open("/storage/generated/" + url);
  });

  const demoAlbum$ = DOMactions.demo$.map(x => album => demo.album);
  const albumUpdated$ = HTTPactions.createdAlbum$
    .map(newpages => album => album.concat(newpages).sort((a,b) => asc(a.index,b.index)));
  const clearAlbum$ = DOMactions.reset$.map(x => item => initial.album);
  const albumPageShuffled$ = HTTPactions.shuffledPage$.map(page => album => { album[page.index] = page; return album; });

  const albumState$ = Observable.merge(albumUpdated$, clearAlbum$, demoAlbum$, albumPageShuffled$, composition$)
    .startWith(initial.album)
    .scan(apply);

  return albumState$;
}


function requests(DOMactions, album$, collection, photos, upload) {
  return {
    createAlbum$: upload.actions.uploadedFiles$.withLatestFrom(collection.state$, album$,
        (photos, collection, album) => ({
          url: '/collections/'+collection.id+'/pages?startindex='+album.length,
          method: 'POST',
          send: photos
        })),

    downloadAlbum$: DOMactions.download$.withLatestFrom(collection.state$, album$,
        (x, collection, album) => ({
          url: '/collections/' + collection.id + '/download',
          method: 'POST',
          send: album
        })),

    shufflePage$: DOMactions.shuffle$.withLatestFrom(collection.state$, photos.state$, album$,
        (page, collection, photos, album) => ({
          url: '/collections/'+collection.id+'/page?index='+page,
          method: 'POST',
          send: _.filter(photos, p => _.where(album[page].tiles, {'photoID': p.id}).length > 0)
        }))
  };
}


function hashMap(photos) {
  if (!photos) return {};
  if (!_.isArray(photos)) return photos;
  console.log(photos);
  return _.object(photos.map(p => [p.id, p.hash]));
}


function view(albumState$, photosState$) {
  let photosDict$ = photosState$.map(hashMap);
  return albumState$.combineLatest(photosDict$,
      (album, photos) =>
        album.length ?
        h('div.container-fluid.limited-width.album', UI.renderAlbum(album, photos)) :
        UI.renderButton()
    );
}


module.exports = function(DOM, HTTP, DOMactions, collection, photos, upload) {
  let compositionMod$ = Composition(DOM);
  let actions = intent(HTTP);
  let state$ = model(DOMactions, actions, compositionMod$);
  let req = requests(DOMactions, state$, collection, photos, upload);
  let vtree$ = view(state$, photos.state$);

  return {
    DOM: vtree$,
    HTTP: req,
    state$,
    actions
  }
}
