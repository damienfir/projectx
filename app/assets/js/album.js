import {Rx} from '@cycle/core';
import {h} from '@cycle/dom';
// import _ from 'underscore';
import demo from "./demo"
import {apply, argArray, asc, initial, jsonPOST, cancelDefault} from './helpers'
import Composition from './composition-ui'
let Observable = Rx.Observable;


function leftOrRight(index) { return index % 2 ? '.pull-right' : '.pull-left'; }


function renderButton() {
  return h('.start-buttons', [
      h('button.btn.btn-primary.btn-lg#create-btn', [
        h('i.fa.fa-book.fa-3x'),
        'Create album'
      ]), 
      h('span.or', 'or'),
      h('button.btn.btn-info.btn-lg#demo-btn', [
        h('i.fa.fa-rocket.fa-3x'),
        'View demo'
      ])
  ]);
}


function renderTile(tile, tileindex, index, photos) {
  function percent(x) { return x * 100 + "%"; }

  var scaleX = 1 / (tile.cx2 - tile.cx1);
  var scaleY = 1 / (tile.cy2 - tile.cy1);

  return h('.ui-tile', {'style': {
    height: percent(tile.ty2 - tile.ty1),
    width: percent(tile.tx2 - tile.tx1),
    top: percent(tile.ty1),
    left: percent(tile.tx1)
  },
    'data-page': index,
    'data-idx': tileindex}, [
  h('img', {
    'src': "/storage/photos/"+tile.hash,
    'draggable': false,
    'style': {
      height: percent(scaleY),
      width: percent(scaleX),
      top: percent(-tile.cy1 * scaleY),
      left: percent(-tile.cx1 * scaleX)
    }}),
  // h('button.btn.btn-danger.delete-btn', h('i.fa.fa-ban'))
  ]);
}


let renderPage = (photos) => (page) => {
  return h('.box-mosaic' + leftOrRight(page.index),
      {'data-page': page.index},
      page.tiles.map(t => _.extend(t, {hash: photos[t.photoID]}))
      .map((tile, index) => renderTile(tile, index, page.index)))
}

function splitIntoSpreads(spreads, page) {
  if(spreads.length && spreads[spreads.length-1].length < 2) {
    spreads[spreads.length-1].push(page);
  } else {
    spreads.push([page]);
  }
  return spreads;
}

let renderBtn = ui => ({index}) => {
  let toggle = !(ui.toggle & (1 << index));
  return h('.btn-group' + leftOrRight(index), [
      h('button.btn.btn-xs.page-btn', {'data-page': index}, ["Page "+(index+1)+' ', /*h('i.fa'+ (toggle ? '.fa-caret-left' : '.fa-caret-right'))*/]),
      toggle ? [
      h('button.btn.btn-default.btn-xs.shuffle-btn', {'data-page': index}, [h('i.fa.fa-refresh'), " Shuffle"]),
      h('button.btn.btn-default.btn-xs.incr-btn', {'data-page': index}, [h('i.fa.fa-plus'), " More"]),
      h('button.btn.btn-default.btn-xs.decr-btn', {'data-page': index}, [h('i.fa.fa-minus'), " Less"])
      ] : ''
  ])
}

let renderSpread = (photos, ui) => (spread) => {
  return h('.spread', [
      h('.spread-paper.shadow.clearfix', spread.map(renderPage(photos))), 
      h('.spread-btn.clearfix', spread.map(renderBtn(ui)))
  ]);
}

function renderAlbum(album, photos, ui) {
  return album
    .reduce(splitIntoSpreads, [])
    .map(renderSpread(photos, ui));
}


function intent(HTTP) {
  return {
    createdAlbum$: jsonPOST(HTTP, /\/collections\/\d+\/pages\?startindex=.*/),
    downloadedAlbum$: jsonPOST(HTTP, /\/collections\/\d+\/download/),
    shuffledPage$: jsonPOST(HTTP, /\/collections\/\d+\/page\/\d+\?index=.*/),
    savedPage$: jsonPOST(HTTP, /\/save/)
  }
}


function model(DOMactions, collectionActions, HTTPactions, composition$) {
  HTTPactions.downloadedAlbum$.subscribe(url => {
    window.open("/storage/generated/" + url);
  });

  const demoAlbum$ = collectionActions.storedAlbum$.map(demo => album => demo.pages);
  const albumUpdated$ = HTTPactions.createdAlbum$
    .map(newpages => album => album.concat(newpages).sort((a,b) => asc(a.index,b.index)));
  const clearAlbum$ = DOMactions.reset$.map(x => item => initial.album);
  const albumPageShuffled$ = HTTPactions.shuffledPage$.map(page => album => { album[page.index] = page; return album; });

  return Observable.merge(albumUpdated$, clearAlbum$, demoAlbum$, albumPageShuffled$, composition$)
    .startWith(initial.album)
    .scan(apply)
    .map(album => album.sort((a,b) => a.index-b.index))
    .shareReplay(1);
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
          send: {collection, album}
        })),

    shufflePage$: DOMactions.shuffle$.withLatestFrom(collection.state$, photos.state$, album$,
        (page, collection, photos, album) => ({
          url: '/collections/'+collection.id+'/page/'+album[page].id+'?index='+page,
          method: 'POST',
          send: _.filter(photos, p => _.where(album[page].tiles, {'photoID': p.id}).length > 0)
        })),
    
    saveAlbum$: DOMactions.save$.withLatestFrom(collection.state$, album$, (ev, collectionState, albumState) => ({
      url: '/save',
      method: 'POST',
      eager: true,
      send: {collection: collectionState, album: albumState}
    }))
  };
}


function hashMap(photos) {
  if (!photos) return {};
  if (!_.isArray(photos)) return photos;
  return _.object(photos.map(p => [p.id, p.hash]));
}


function view(albumState$, photosState$, uiState$) {
  let photosDict$ = photosState$.map(hashMap);
  return albumState$.combineLatest(photosDict$, uiState$,
      (album, photos, ui) =>
        album.length ?
        h('div.container-fluid.limited-width.album', renderAlbum(album, photos, ui)) :
        renderButton()
    );
}

function uiModel(DOM) {
  return Observable.merge(
    DOM.select('.page-btn').events('click').map(cancelDefault).map(ev => ev.target['data-page'])
      .map(idx => state => _.extend(state, {'toggle': state.toggle ^ (1 << idx)}))
  )
  .startWith({'toggle': 0})
  .scan(apply);
}


module.exports = function(DOM, HTTP, DOMactions, collection, photos, upload) {
  let compositionMod$ = Composition(DOM);
  let actions = intent(HTTP);
  let state$ = model(DOMactions, collection.actions, actions, compositionMod$);
  let req = requests(DOMactions, state$, collection, photos, upload);
  let ui$ = uiModel(DOM);
  let vtree$ = view(state$, photos.state$, ui$);

  return {
    DOM: vtree$,
    HTTP: req,
    state$,
    actions
  }
}
