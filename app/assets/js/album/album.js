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
    addPhotoCover$: helpers.btn(DOM, '.cover-btn').map(ev => ev.target['data-id']),
  }
}


let params = [];


function model(DOMactions, actions, collection, editing, upload) {
  actions.downloadedAlbum$.subscribe(res => {
    window.open("/storage/generated/" + res.text);
  });

  actions.shuffledPage$.subscribe(ev => editing.actions.cancelExt$.onNext(false));

  let demoAlbum$ = collection.actions.storedAlbum$
    .map(demo => _.sortBy(demo.pages, 'index'))
    .map(pages => album => pages);

  let albumUpdated$ = actions.createdAlbum$
    .map(newpage => album => {
      // album[newpage.index] = newpage;
      return album.concat(newpage).sort(ascIndex);
    });
  
  let clearAlbum$ = DOMactions.reset$
    .map(x => item => []);

  // let coverPage$ = upload.actions.photosGroups$
  //   .map(photos => album => {
  //     if (album.length === 0) album.concat({});
  //     return album;
  //   })
  //   .take(1);

  // let uploadedPhotos$ = coverPage$.concat(upload.actions.photosGroups$
  //   .map(p => album => album.concat({})));

  let createdCover$ = actions.createdAlbum$
    .filter(pages => pages.index === 0);

  let albumPageShuffled$ = actions.shuffledPage$
    .map(page => album =>
        { album[page.index] = page; return album; });

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
      clearAlbum$,
      demoAlbum$,
      albumPageShuffled$,
      swapTiles$,
      dragPhoto$,
      rotatePhoto$,
      clickEdge$,
      // uploadedPhotos$,
      dragEdge$)
    .startWith([])
    .scan(apply)
    .map(album => album.sort((a,b) => a.index-b.index))
    .shareReplay(1);
}


function requests(DOMactions, actions, album$, collection, photos, upload, editing) {

  let photosFromTiles = (photos, tiles) => _.filter(photos, p => _.where(tiles, {'photoID': p.id}).length > 0);

  let addOrRemove = (array, item) =>
    _.isUndefined(item) ? array :
      ((array.map(p => p.id).indexOf(item.id) === -1) ?
        array.concat(item) : array.filter(el => el.id !== item.id));

  let getOtherPage = (page1, N) =>  {
    let page2 = (page1 % 2) ? page1 - 1 : page1 + 1;
    return page2 < 1 ? page2 + 2 : (page2 >= N ? page2 - 2 : page2);
  }

  let cover$ = editing.actions.cover$.withLatestFrom(editing.state$, (ev, {selected}) => ({
    from: selected,
    to: {page: 0}
  }));

  let moveTile$ = editing.actions.move$.merge(cover$).withLatestFrom(album$, photos.state$, (move, album, photos) => {
      let photosA = photosFromTiles(photos, album[move.from.page].tiles);
      let photosB = photosFromTiles(photos, album[move.to.page].tiles);
      let photoID = album[move.from.page].tiles[move.from.idx].photoID;
      return [
        {page: move.to.page, photos: _.uniq(photosB.concat(photos.filter(p => p.id === photoID)))}
      ].concat(move.to.page !== 0 ? {page: move.from.page, photos: photosA.filter(p => p.id !== photoID)} : [])
    })
    .filter(([a,b]) => b ? b.photos.length > 0 : true)
    .flatMap(reqs => Rx.Observable.fromArray(reqs));

  let removeTile$ = editing.actions.remove$
    .withLatestFrom(album$, photos.state$, editing.state$, (ev, album, photos, {selected}) => ({
      page: selected.page,
      photos: photosFromTiles(photos, album[selected.page].tiles)
        .filter(p => p.id !== album[selected.page].tiles[selected.idx].photoID)
    }));


  let npics = 3;
  let photosGroups$ = upload.actions.startUpload$.flatMapLatest(([ev,collection]) => Rx.Observable.merge(
      upload.actions.fileUpload$
        .bufferWithCount(npics)
        .map(files => files[npics-1].slice(-npics)),
      upload.actions.fileUpload$
        .take(1)
        .withLatestFrom(album$, helpers.argArray).filter(([p,a]) => a.length === 0)
        .map(([p,a]) => p),
      upload.actions.fileUpload$
        .filter(files => files.length === ev.length)
        .map(files => files.slice(-(files.length % npics)))
        .filter(f => f.length > 0)
   )).do(x => console.log(x));

  let index = 0;
  DOMactions.reset$.subscribe(ev => index = 0);

  return {
    createAlbum$: photosGroups$.withLatestFrom(collection.state$, album$,
        (photos, collection, album) => {
          if (index === 0) index = album.length;
          index += 1;
          return {
            url: '/collections/'+collection.id+'/pages?index='+(index-1),
            method: 'POST',
            send: photos
          }
        }),

    downloadAlbum$: DOMactions.download$.withLatestFrom(collection.state$, album$,
        (x, collection, album) => ({
          url: '/collections/' + collection.id + '/download',
          method: 'POST',
          send: {collection, album}
        })),

    shufflePage$: actions.shuffle$.withLatestFrom(collection.state$, photos.state$, album$,
        (page, collection, photos, album) => ({
          url: '/collections/'+collection.id+'/page/'+album[page].id+'?index='+page,
          method: 'POST',
          send: photosFromTiles(photos, album[page].tiles)
        })),

    generatePage$: moveTile$.merge(removeTile$).withLatestFrom(collection.state$, album$, (req, collection, album) => ({
        url: '/collections/'+collection.id+'/page/'+album[req.page].id+'?index='+req.page,
        method: 'POST',
        send: req.photos
      })),

    incrDecrPhotos$: actions.incrPhotos$.filter(p => p !== 0).withLatestFrom(album$, (page1, album) => {
        return [page1, getOtherPage(page1, album.length)];
      }).merge(actions.decrPhotos$.filter(p => p !== 0).withLatestFrom(album$, (page2, album) => {
        return [getOtherPage(page2, album.length), page2];
      }))
      .withLatestFrom(album$, ([incr, decr], album) => ({'incr': album[incr], 'decr': album[decr]}))
      .withLatestFrom(photos.state$, ({incr, decr}, photos) => {
        let photos1 = photosFromTiles(photos, incr.tiles);
        let photos2 = photosFromTiles(photos, decr.tiles);
        if (photos2.length > 1) photos1.unshift(photos2.pop())
        return [
          {'page': incr, 'photos': photos1},
          {'page': decr, 'photos': photos2}
        ]
      })
      .flatMap(pages => Observable.fromArray(pages).withLatestFrom(collection.state$, ({page, photos}, collection) => ({
        url: '/collections/' + collection.id + '/page/' + page.id + '?index=' + page.index,
        method: 'POST',
        send: photos
      }))),

    incrDecrCover$: actions.incrPhotos$.filter(p => p === 0).map(p => 1)
      .merge(actions.decrPhotos$.filter(p => p === 0).map(p => -1))
      .withLatestFrom(collection.state$, album$, photos.state$, (delta, collection, album, photos) => {
        let page = album[0];
        let coverPhotos = photosFromTiles(photos, page.tiles);
        let coverIDs = coverPhotos.map(p => p.id)
        let allIDs = photos.map(p => p.id)
        let allowedIDs = _.difference(allIDs, coverIDs);
        if (delta > 0) {
          if (allowedIDs.length > 0) coverPhotos.push(photos[allIDs.indexOf(_.sample(allowedIDs))])
        } else {
          if (coverPhotos.length > 1) coverPhotos.pop()
        }
        return {
          method: 'POST',
          url: '/collections/' + collection.id + '/page/' + page.id + '?index=' + page.index,
          eager: true,
          send: coverPhotos
        }
      }),
    
    editPhotoCover$: actions.addPhotoCover$.withLatestFrom(collection.state$, photos.state$, album$,
      (photoID, collection, photos, album) => {
        let cover = album[0];
        return {
          url: '/collections/' + collection.id + '/page/' + cover.id + '?index=' + 0,
          method: 'POST',
          send: addOrRemove(photosFromTiles(photos, cover.tiles), photos.filter(p => p.id === photoID).shift())
        };
      })
      .filter(req => req.send.length > 0)
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
