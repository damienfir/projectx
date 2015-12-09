/* @flow */

import Rx from 'rx';
import Immutable from 'immutable';
import {h} from '@cycle/dom';
import view from './view'
import {apply, argArray, asc, ascIndex, initial, jsonPOST, jsonPOSTResponse, cancelDefault} from '../helpers'
import helpers from '../helpers'
import * as utils from '../utils'
let Observable = Rx.Observable;





function intent(DOM, HTTP) {
  return {
    createdAlbum$: jsonPOST(HTTP, /\/collections\/\d+\/pages\?index=.*/),
    downloadedAlbum$: jsonPOSTResponse(HTTP, /\/collections\/\d+\/download/),
    shuffledPage$: jsonPOST(HTTP, /\/collections\/\d+\/page\/\d+\?index=.*/),
    savedPage$: jsonPOST(HTTP, /\/save/),
    shuffle$: helpers.btn(DOM, '.shuffle-btn').map(ev => ev.target['data-page']),
    incrPhotos$: helpers.btn(DOM, '.incr-btn').map(ev => ev.target['data-page']),
    decrPhotos$: helpers.btn(DOM, '.decr-btn').map(ev => ev.target['data-page']),
    removeLastPage$: new Rx.Subject()
  }
}


let params = [];


function model(DOMactions, actions, collection, editing, upload) {
  // actions.downloadedAlbum$.subscribe(res => {
  //   window.open("/storage/generated/" + res.text);
  // });

  actions.shuffledPage$.merge(actions.removeLastPage$).subscribe(ev => editing.actions.cancelExt$.onNext(false));

  let demoAlbum$ = collection.actions.storedAlbum$
    .map(demo => _.sortBy(demo.pages, 'index'))
    .map(pages => album => pages);

  let albumUpdated$ = actions.createdAlbum$
    .map(newpage => album => album.concat(newpage).sort(ascIndex));
  
  // let clearAlbum$ = DOMactions.reset$
  //   .map(x => item => []);

  let removeLastPage$ = actions.removeLastPage$.map(p => album => {album.pop(); return album});

  let albumPageShuffled$ = actions.shuffledPage$
    .map(page => album =>
        { album[page.index] = page; return album; });


  // Editing
  let swapTiles$ = editing.actions.swap$
    .map(swap => album => 
      utils.swapTiles(album, [swap.from.page, swap.from.idx], [swap.to.page, swap.to.idx]));

  let dragPhoto$ = editing.actions.drag$
    .map(drag => album => {
      let moved_x = utils.move(album[drag.page].tiles[drag.idx], drag.dx, 'cx1', 'cx2');
      album[drag.page].tiles[drag.idx] = utils.move(moved_x, drag.dy, 'cy1', 'cy2');
      return album;
    });

  let rotatePhoto$ = editing.actions.rotate$
    .withLatestFrom(editing.state$, (ev, editing) => album => {
      // let tile = album[editing.selected.page].tiles[editing.selected.idx];
      // tile = utils.rotateTile(tile);
      // tile.rot = ((tile.rot || 0) + 90) % 360;
      // album[editing.selected.page].tiles[editing.selected.idx] = tile;
      return album;
    });

  let clickEdge$ = editing.actions.clickEdge$.map(ev => album => {
    params = _.extend(utils.getParams(album[ev.page].tiles, ev.x, ev.y), {page: ev.page});
    return album;
  });

  let dragEdge$ = editing.actions.dragEdge$.map(drag => album => {
    let newTiles = utils.dragTiles(album[params.page].tiles, params, drag.dx, drag.dy);
    album[params.page].tiles = newTiles;
    return album;
  });

  return Observable.merge(
      albumUpdated$,
      // clearAlbum$,
      demoAlbum$,
      albumPageShuffled$,
      swapTiles$,
      dragPhoto$,
      removeLastPage$,
      rotatePhoto$,
      clickEdge$,
      dragEdge$)
    .startWith([])
    .scan(apply)
    .map(album => album.sort((a,b) => a.index-b.index))
    .shareReplay(1);
}

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

function requests(DOMactions, actions, album$, collection, photos, upload, editing) {

  let photosFromTiles = (photos, tiles) => _.filter(photos, p => _.where(tiles, {'photoID': p.id}).length > 0);

  let cover$ = editing.actions.cover$.withLatestFrom(editing.state$, (ev, {selected}) => ({
    from: selected,
    to: {page: 0}
  }));


  let [moveTile$, addPage$] = editing.actions.move$.merge(cover$)
    .withLatestFrom(album$, photos.state$, (move, album, photos) => {
      let photoID = album[move.from.page].tiles[move.from.idx].photoID;
      let photosA = _.uniq(photosFromTiles(photos, album[move.from.page].tiles)
        .filter(p => p.id !== photoID));
      let photosB = (move.to.page < 0 ? [] : photosFromTiles(photos, album[move.to.page].tiles))
          .concat(photos.filter(p => p.id === photoID));
      
      let reqs = [{page: move.to.page, photos: photosB}];
      if (move.to.page !== 0) reqs.push({page: move.from.page, photos: photosA});
      return reqs;
    })
    .filter(([a,b]) => b ? b.photos.length > 0 : true) // stop if source page has only one image
    .flatMap(reqs => Rx.Observable.fromArray(reqs))
    .partition(req => req.page >= 0);


  let removeTile$ = editing.actions.remove$
    .withLatestFrom(album$, photos.state$, editing.state$, (ev, album, photos, {selected}) => {
      if (_.isUndefined(selected) || _.isUndefined(album[selected.page])) return false;
      return {
        page: selected.page,
        photos: photosFromTiles(photos, album[selected.page].tiles)
          .filter(p => p.id !== album[selected.page].tiles[selected.idx].photoID)
      }
    })
  .filter(_.identity);

  let shufflePage$ = actions.shuffle$
    .withLatestFrom(collection.state$, photos.state$, album$,
        (page, collection, photos, album) => {
          if (_.isUndefined(album[page])) return {};
          return {
            page,
            photos: photosFromTiles(photos, album[page].tiles)
          }
        })
    .filter(_.identity);


  let chooseNPics = (page) => {
    if (page === 0) return 1;
    else if (page === 1) return 3;
    else return Math.floor(Math.random()*4 + 1);
  }


  let photosGroups$ = upload.actions.startUpload$.do(x => console.log(x)).withLatestFrom(album$, helpers.argArray)
    .flatMapLatest(([[ev,collection], album]) => {
      let page = album.length;
      return upload.actions.fileUpload$
        .do(x => console.log(x))
        .scan((prev, files) => {
          let newPhoto = files.slice(-1);
          let remainingPhotos = ev.length - files.length + 1;
          if (prev.photos && prev.photos.length < prev.npics) {
            if (files.length === ev.length) return {
              npics: prev.photos.length+1,
              photos: prev.photos.concat(newPhoto),
              page: prev.page
            }
            else return {
              npics: prev.npics,
              photos: prev.photos.concat(newPhoto),
              page: prev.page
            }
          }
          else return {
            npics: Math.min(chooseNPics(page), remainingPhotos),
            photos: newPhoto,
            page: page++
          }
        }, {})
      .filter(({npics, photos}) => photos.length === npics)
      .concatMap((obj) => {
        return Rx.Observable.fromArray(obj.photos)
          .flatMap(photo => makeUploadRequest(photo, collection)
              .tap(p => photos.actions.uploadedPhoto$.onNext(p)))
          .reduce((photos, photo) => photos.concat(photo), [])
          .map(photos => ({page: obj.page, photos}))
      })
    })
    .share();


  removeTile$.filter(x => !x.photos.length).pluck('page')//.merge(editing.actions.move$.pluck('from.page'))
    .withLatestFrom(album$, (page,album) => page === album.length-1).filter(_.identity)
    .subscribe(r => actions.removeLastPage$.onNext());


  return {
    createAlbum$: photosGroups$.merge(addPage$)
      .withLatestFrom(collection.state$, album$,
        (group, collection, album) => {
          if (group.page < 0) group.page = album.length;
          return {
            url: '/collections/'+collection.id+'/pages?index='+group.page,
            method: 'POST',
            send: group.photos,
            eager: true
          }
        }),

    generatePage$: moveTile$.merge(removeTile$).merge(shufflePage$)
      .filter(req => req.photos.length)
      .withLatestFrom(collection.state$, album$, (req, collection, album) => ({
        url: '/collections/'+collection.id+'/page/'+album[req.page].id+'?index='+req.page,
        method: 'POST',
        send: req.photos
      })),

    downloadAlbum$: DOMactions.download$
      .withLatestFrom(collection.state$, album$,
        (x, collection, album) => ({
          url: '/collections/' + collection.id + '/download',
          method: 'POST',
          send: {collection, album}
        })),
  };
}



module.exports = function(DOM, HTTP, DOMactions, collection, photos, upload, editing) {
  let actions = intent(DOM, HTTP);
  let state$ = model(DOMactions, actions, collection, editing, upload);
  let req = requests(DOMactions, actions, state$, collection, photos, upload, editing);
  let vtree$ = view(state$, photos.state$, collection.state$, editing.state$);

  return {
    DOM: vtree$,
    HTTP: req,
    state$,
    actions
  }
}
