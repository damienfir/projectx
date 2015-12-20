/* @flow */

import Rx from 'rx';
import {List, Map, fromJS} from 'immutable';
import {h} from '@cycle/dom';
import view from './view';
import {apply, argArray, asc, ascIndex, initial, jsonPOST, jsonPOSTResponse, cancelDefault} from '../helpers';
import helpers from '../helpers';
import * as utils from './utils';
let Observable = Rx.Observable;


function intent(DOM, HTTP) {
  return {
    createdAlbum$: jsonPOST(HTTP, /\/collections\/\d+\/pages\?index=.*/).map(x => fromJS(x)),
    downloadedAlbum$: jsonPOSTResponse(HTTP, /\/collections\/\d+\/download/).map(x => fromJS(x)),
    shuffledPage$: jsonPOST(HTTP, /\/collections\/\d+\/page\/\d+\?index=.*/).map(x => fromJS(x)),
    savedPage$: jsonPOST(HTTP, /\/save/),
    shuffle$: helpers.btn(DOM, '.shuffle-btn').map(ev => ev.target['data-page']),
    incrPhotos$: helpers.btn(DOM, '.incr-btn').map(ev => ev.target['data-page']),
    decrPhotos$: helpers.btn(DOM, '.decr-btn').map(ev => ev.target['data-page']),
    removeLastPage$: new Rx.Subject()
  };
}


let params = {};

let index = page => page.get('index');


function model(DOMactions, actions, collection, editing, upload) {

  actions.shuffledPage$.merge(actions.removeLastPage$).subscribe(ev => editing.actions.cancelExt$.onNext(false));

  let demoAlbum$ = collection.actions.storedAlbum$
    .map(demo => album => fromJS(demo.pages).sortBy(index));

  let albumUpdated$ = actions.createdAlbum$
    .map(newpage => album => album.push(newpage).sortBy(index));

  let removeLastPage$ = actions.removeLastPage$.map(p => album => album.pop());

  let albumPageShuffled$ = actions.shuffledPage$
    .map(page => album => album.update(page.get('index'),
          p => page.update('tiles',
            tiles => tiles.map(
              tile => {
                let samePhotoID = t => t.get('photoID') === tile.get('photoID');
                let rot = (p.get('tiles').find(samePhotoID) ||
                  album.reduce((tiles, page) => tiles.concat(page.get('tiles')), List()).find(samePhotoID) ||
                  Map({rot: 0})).get('rot');
                return fromJS(utils.rotateTile(tile.toJS(), rot));
              }))));


  // Editing
  let swapTiles$ = editing.actions.swap$
    .map(swap => album => 
      fromJS(utils.swapTiles(album.toJS(), [swap.from.page, swap.from.idx], [swap.to.page, swap.to.idx])));

  let dragPhoto$ = editing.actions.drag$
    .map(drag => album => {
      let moved_x = utils.move(album.getIn([drag.page, 'tiles', drag.idx]).toJS(), drag.dx, 'cx1', 'cx2');
      return album.setIn([drag.page, 'tiles', drag.idx], fromJS(utils.move(moved_x, drag.dy, 'cy1', 'cy2')));
    });

  let rotatePhoto$ = editing.actions.rotate$
    .withLatestFrom(editing.state$, (ev, editing) => album => 
       album.updateIn([editing.selected.page, 'tiles', editing.selected.idx],
          tile => fromJS(utils.rotateTile(tile.toJS())))
    );

  let clickEdge$ = editing.actions.clickEdge$.map(ev =>
      album => {
        params = _.extend(utils.getParams(album.get(ev.page).get('tiles'), ev.x, ev.y), {page: ev.page});
        return album;
    });
  // clickEdge$.subscribe(x => console.log(x));

  let dragEdge$ = editing.actions.dragEdge$.map(drag =>
      album => album.updateIn([params.page, 'tiles'],
        tiles => utils.dragTiles(tiles, params, drag.dx, drag.dy))
  );
  // dragEdge$.subscribe(x => console.log(x));

  let state$ = Observable.merge(
      albumUpdated$,
      demoAlbum$,
      albumPageShuffled$,
      swapTiles$,
      dragPhoto$,
      removeLastPage$,
      rotatePhoto$,
      clickEdge$,
      dragEdge$
    )
    .startWith(List())
    .scan(apply)
    .shareReplay(1);

  // Observable.merge(clickEdge$, dragEdge$).withLatestFrom(state$, (func, album) => func(album)).subscribe(x => console.log('ok'));
  
  return state$;
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


function photosFromTiles(photos, tiles) {
  return _.filter(photos, p => 
            _.where(tiles, {'photoID': p.id}).length > 0);
}


function chooseNPics(page) {
  if (page === 0) return 1;
  else if (page === 1) return 3;
  else return Math.floor(Math.random()*4 + 1);
}


function requests(DOMactions, actions, album$, photos, upload, editing) {

  let cover$ = editing.actions.cover$.withLatestFrom(editing.state$, (ev, {selected}) => ({
    from: selected,
    to: {page: 0}
  }));


  let moveTile$ = editing.actions.move$.merge(cover$)
    .withLatestFrom(album$, photos.state$, (move, album, photos) => {
      let from = {page: album.get(move.from.page).toJS()};
      let to = {page: move.to.page >= 0 ? album.get(move.to.page).toJS() : undefined};
      let tile = from.page.tiles[move.from.idx];
      if (_.isUndefined(tile)) return false;
      let photoID = tile.photoID;

      let photosFrom = photosFromTiles(photos, from.page.tiles);
      if (_.isUndefined(to.page)) {
        to.photos = [];
        from.photos = _.uniq(photosFrom.filter(p => p.id !== photoID));
      } else {
        to.photos = photosFromTiles(photos, to.page.tiles);
        from.photos = _.uniq(photosFrom.filter(p => p.id !== photoID));
      }
      to.photos = to.photos.concat(photos.filter(p => p.id === photoID));

      if (to.page && to.page.index === 0) {
        return [to];
      } else if (from.photos.length > 0 || from.page.index === album.size-1) {
        return [to, from];
      } else {
        return false;
      }
    })
    .filter(_.identity)
    .flatMap(reqs => Rx.Observable.fromArray(reqs))
    .share();


  let removeTile$ = editing.actions.remove$
    .withLatestFrom(album$, photos.state$, editing.state$, (ev, album, photos, {selected}) => {
      if (_.isUndefined(selected) || _.isUndefined(album.get(selected.page))) return false;
      let page = album.get(selected.page).toJS();
      return {
        page,
        photos: photosFromTiles(photos, page.tiles)
          .filter(p => p.id !== page.tiles[selected.idx].photoID)
      };
    })
  .filter(_.identity);

  let shufflePage$ = actions.shuffle$
    .withLatestFrom(photos.state$, album$,
        (index, photos, album) => {
          let page = album.get(index, Map()).toJS();
          console.log(page);
          if (!page) return {};
          return {
            page,
            photos: photosFromTiles(photos, page.tiles)
          };
        })
    .filter(_.identity);


  let [pageExist$, pageNew$] = moveTile$.partition(req => !_.isUndefined(req.page));
  let generatePage$ = pageExist$
    .merge(removeTile$)
    .merge(shufflePage$);

  let addPage$ = pageNew$.map(({page, photos}) => ({photos, page: -1}));

  let albumSize$ = album$.map(album => album.size);

  let photosGroups$ = upload.actions.startUpload$.withLatestFrom(albumSize$, helpers.argArray)
    .flatMapLatest(([[ev,collection], page]) => {
      return Rx.Observable.from(ev)
        .scan((acc,el) => acc.concat(el), [])
        .scan((prev, files) => {
          let newPhoto = page === 1 ? files.slice(-2) : files.slice(-1);
          let remainingPhotos = ev.length - files.length + 1;
          if (prev.photos && prev.photos.length < prev.npics) {
            if (files.length === ev.length) return {
              npics: prev.photos.length+1,
              photos: prev.photos.concat(newPhoto),
              page: prev.page
            };
            else return {
              npics: prev.npics,
              photos: prev.photos.concat(newPhoto),
              page: prev.page
            };
          }
          else return {
            npics: Math.min(chooseNPics(page), remainingPhotos),
            photos: newPhoto,
            page: page++
          };
        }, {})
      .filter(({npics, photos}) => photos.length === npics)
      .concatMap((obj) => {
        return Rx.Observable.fromArray(obj.photos)
          .flatMap(photo => makeUploadRequest(photo, collection)
              .tap(p => upload.actions.uploaded$.onNext(p))
              .tap(p => photos.actions.uploadedPhoto$.onNext(p)))
          .reduce((photos, photo) => photos.concat(photo), [])
          .map(photos => ({page: obj.page, photos}));
      });
    })
    .share();


  // remove last page if empty
  generatePage$
    .withLatestFrom(albumSize$, (req, size) => req.page.index === size-1 && req.photos.length === 0)
    .filter(_.identity)
    .subscribe(r => actions.removeLastPage$.onNext());

  return {
    createAlbum$: photosGroups$.merge(addPage$),
    generatePage$: generatePage$.filter(req => req.photos.length > 0 && !_.isUndefined(req.page))
  };
}


function makeRequests(req, album$, collection) {
  let albumSize$ = album$.map(album => album.size);

  return {
    createAlbum$: req.createAlbum$.withLatestFrom(collection.state$, albumSize$,
        (group, collection, size) => {
          if (group.page < 0) group.page = size;
          return {
            url: '/collections/'+collection.id+'/pages?index='+group.page,
            method: 'POST',
            send: group.photos,
            eager: true
          };
        }),

    generatePage$: req.generatePage$.withLatestFrom(collection.state$, (req, collection) => ({
        url: '/collections/'+collection.id+'/page/'+req.page.id+'?index='+req.page.index,
        method: 'POST',
        send: req.photos
      }))
  };
}


function ui(actions, requests) {
  let initialState = fromJS({
    'shuffling': [],
  });

  let shuffling$ = requests.generatePage$.map(req => req.page.index)
    .map(page => state => state.update('shuffling', a => a.push(page)))
    .merge(actions.shuffledPage$.map(page => page.get('index'))
        .map(page => state => state.update('shuffling', a => a.filter(p => p !== page))));

  let model$ = Rx.Observable.merge(
    shuffling$
  );

  return model$.startWith(initialState).scan(apply).shareReplay(1);
}


module.exports = function(DOM, HTTP, DOMactions, collection, photos, upload, editing) {
  let actions = intent(DOM, HTTP);
  let state$ = model(DOMactions, actions, collection, editing, upload);
  let req = requests(DOMactions, actions, state$, photos, upload, editing);
  let ui$ = ui(actions, req);
  let http = makeRequests(req, state$, collection);
  let vtree$ = view(state$, collection.state$, editing.state$, ui$);

  return {
    DOM: vtree$,
    HTTP: http,
    state$,
    actions
  };
};
