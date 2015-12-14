/* @flow */

import Rx from 'rx';
import Immutable from 'immutable';
import {h} from '@cycle/dom';
import view from './view';
import {apply, argArray, asc, ascIndex, initial, jsonPOST, jsonPOSTResponse, cancelDefault} from '../helpers';
import helpers from '../helpers';
import * as utils from './utils';
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
  };
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

  let removeLastPage$ = actions.removeLastPage$.map(p => album => {album.pop(); return album;});

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
      let tile = utils.rotateTile(album[editing.selected.page].tiles[editing.selected.idx]);
      album[editing.selected.page].tiles[editing.selected.idx] = tile;
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


function photosFromTiles(photos, tiles) {
  return _.filter(photos, p => 
            _.where(tiles, {'photoID': p.id}).length > 0);
}


function chooseNPics(page) {
  if (page === 0) return 1;
  else if (page === 1) return 3;
  else return Math.floor(Math.random()*4 + 1);
}


function requests(DOMactions, actions, album$, collection, photos, upload, editing) {

  let cover$ = editing.actions.cover$.withLatestFrom(editing.state$, (ev, {selected}) => ({
    from: selected,
    to: {page: 0}
  }));


  let moveTile$ = editing.actions.move$.merge(cover$)
    .withLatestFrom(album$, photos.state$, (move, album, photos) => {
      let from = {page: album[move.from.page]};
      let to = {page: album[move.to.page]};
      let photoID = from.page.tiles[move.from.idx].photoID;

      from.photos =_.uniq(photosFromTiles(photos, from.page.tiles)
        .filter(p => p.id !== photoID));
      to.photos = (_.isUndefined(to.page) ? [] : photosFromTiles(photos, to.page.tiles))
          .concat(photos.filter(p => p.id === photoID));

      if (from.photos.length > 0 || from.page.index === album.length-1) {
        return [from, to];
      } else {
        return false;
      }
    })
    .filter(_.identity)
    .flatMap(reqs => Rx.Observable.fromArray(reqs))
    .share();


  let removeTile$ = editing.actions.remove$
    .withLatestFrom(album$, photos.state$, editing.state$, (ev, album, photos, {selected}) => {
      if (_.isUndefined(selected) || _.isUndefined(album[selected.page])) return false;
      let page = album[selected.page];
      return {
        page,
        photos: photosFromTiles(photos, page.tiles)
          .filter(p => p.id !== page.tiles[selected.idx].photoID)
      };
    })
  .filter(_.identity);

  let shufflePage$ = actions.shuffle$
    .withLatestFrom(collection.state$, photos.state$, album$,
        (page, collection, photos, album) => {
          if (_.isUndefined(page)) return {};
          return {
            page,
            photos: photosFromTiles(photos, page.tiles)
          };
        })
    .filter(_.identity);


  let [pageExist$, pageNew$] = moveTile$.partition(req => !_.isUndefined(req.page));
  let generatePage$ = pageExist$.merge(removeTile$)
    .merge(shufflePage$);

  let addPage$ = pageNew$.map(({page, photos}) => ({photos, page: -1}));

  let photosGroups$ = upload.actions.startUpload$.withLatestFrom(album$, helpers.argArray)
    .flatMapLatest(([[ev,collection], album]) => {
      let page = album.length;
      return Rx.Observable.from(ev)
        .scan((acc,el) => acc.concat(el), [])
        .scan((prev, files) => {
          let newPhoto = files.slice(-1);
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
    .withLatestFrom(album$, (req, album) => req.page.index === album.length-1 && req.photos.length === 0)
    .filter(_.identity)
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
          };
        }),

    generatePage$: generatePage$
      .filter(req => req.photos.length > 0 && !_.isUndefined(req.page))
      .withLatestFrom(collection.state$, album$, (req, collection, album) => ({
        url: '/collections/'+collection.id+'/page/'+req.page.id+'?index='+req.page.index,
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
  let vtree$ = view(state$, collection.state$, editing.state$);

  return {
    DOM: vtree$,
    HTTP: req,
    state$,
    actions
  };
};
