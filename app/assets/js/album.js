import {Rx} from '@cycle/core';
import {h} from '@cycle/dom';
import {apply, argArray, asc, ascIndex, initial, jsonPOST, cancelDefault} from './helpers'
import Composition from './composition-ui'
let Observable = Rx.Observable;


let coverpage = {
  tiles: [],
  index: 0
};


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


function renderTile(tile, tileindex, index) {
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
    h('button.btn.btn-primary.hover-btn.cover-btn', {'data-id': tile.photoID}, (index === 0) ? h('i.fa.fa-minus') : h('i.fa.fa-plus'))
  ]);
}


let renderCover = (title, page) => {
  return [
    page.tiles.length === 0 ? h('.nocover', [
      // h('i.fa.fa-', "Cover page"),
      h('h6.covermessage.center', "Select images from the album to appear on the cover.")
    ]) : h('.cover-title' + (title ? '' : '.notitle'), title ? title : 'Album title...')
  ]
}

let renderPage = (photos, title) => (page) => {
  return h('.box-mosaic' + leftOrRight(page.index),
      {'data-page': page.index},
      page.tiles
        .map(t => _.extend(t, {hash: photos[t.photoID]}))
        .map((tile, index) => renderTile(tile, index, page.index))
        .concat((page.index === 0) ? renderCover(title, page) : [])
  );
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
      // h('button.btn.btn-default.btn-xs.incr-btn', {'data-page': index}, [h('i.fa.fa-plus'), " More"]),
      // h('button.btn.btn-default.btn-xs.decr-btn', {'data-page': index}, [h('i.fa.fa-minus'), " Less"])
      ] : ''
  ])
}

let renderSpread = (photos, ui, title) => (spread) => {
  return h('.spread', [
      h('.spread-paper.shadow.clearfix', spread.map(renderPage(photos, title))), 
      h('.spread-btn.clearfix', spread.map(renderBtn(ui)))
  ]);
}

function renderAlbum(album, photos, ui, title) {
  return album
    .reduce(splitIntoSpreads, [])
    .map(renderSpread(photos, ui, title));
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

  let demoAlbum$ = collectionActions.storedAlbum$
    .map(demo => _.sortBy(demo.pages, 'index'))
    .do(x => console.log(x))
    .map(pages => (pages[0].index === 0) ? pages : [coverpage].concat(pages))
    .map(pages => album => pages);

  let albumUpdated$ = HTTPactions.createdAlbum$
    .filter(pages => pages[0].index > 0)
    .map(newpages => album => album.concat(newpages).sort(ascIndex));

  let clearAlbum$ = DOMactions.reset$
    .map(x => item => [coverpage]);

  let createdCover$ = HTTPactions.createdAlbum$
    .filter(pages => pages[0].index === 0)
    .map(pages => pages[0]);

  let albumPageShuffled$ = HTTPactions.shuffledPage$.merge(createdCover$)
    .map(page => album => { album[page.index] = page; return album; });

  return Observable.merge(albumUpdated$, clearAlbum$, demoAlbum$, albumPageShuffled$, composition$)
    .startWith([coverpage])
    .scan(apply)
    .map(album => album.sort((a,b) => a.index-b.index))
    .shareReplay(1);//.do(x => console.log(x));
}


function requests(DOMactions, album$, collection, photos, upload) {

  let photosFromTiles = (photos, tiles) => _.filter(photos, p => _.where(tiles, {'photoID': p.id}).length > 0);

  let addOrRemove = (array, item) =>
    _.isUndefined(item) ? array :
      ((array.map(p => p.id).indexOf(item.id) === -1) ?
        array.concat(item) : array.filter(el => el.id !== item.id));

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
          send: photosFromTiles(photos, album[page].tiles)
        })),
    
    saveAlbum$: DOMactions.save$.withLatestFrom(collection.state$, album$, (ev, collectionState, albumState) => ({
      url: '/save',
      method: 'POST',
      eager: true,
      send: {collection: collectionState, album: albumState}
    })),

    editPhotoCover$: DOMactions.addPhotoCover$.withLatestFrom(collection.state$, photos.state$, album$,
      (photoID, collection, photos, album) => {
        let id = album[coverpage.index].id
        let url = _.isUndefined(id) ?
          '/collections/' + collection.id + '/pages?startindex='+coverpage.index :
          '/collections/' + collection.id + '/page/' + id + '?index=' + coverpage.index ;

        return {
          url: url,
          method: 'POST',
          send: addOrRemove(photosFromTiles(photos, album[coverpage.index].tiles), photos.filter(p => p.id === photoID).shift())
        };
      })
      .filter(req => req.send.length > 0)
  };
}


function hashMap(photos) {
  if (!photos) return {};
  if (!_.isArray(photos)) return photos;
  return _.object(photos.map(p => [p.id, p.hash]));
}


function view(albumState$, photosState$, uiState$, collectionState$) {
  let photosDict$ = photosState$.map(hashMap);
  return albumState$.combineLatest(photosDict$, uiState$, collectionState$,
      (album, photos, ui, collection) =>
        album.length > 1 ?
        h('div.container-fluid.limited-width.album', renderAlbum(album, photos, ui, collection.name)) :
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
  let vtree$ = view(state$, photos.state$, ui$, collection.state$);

  return {
    DOM: vtree$,
    HTTP: req,
    state$,
    actions
  }
}
