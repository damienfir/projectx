import Rx from 'rx';
import {h} from '@cycle/dom';
import {apply, argArray, asc, ascIndex, initial, jsonPOST, jsonPOSTResponse, cancelDefault} from './helpers'
import helpers from './helpers'
let Observable = Rx.Observable;


let coverpage = {
  tiles: [],
  collectionID: -1,
  index: 0
};

let blankpage = {
  tiles: [],
  index: -1
}


let leftOrRight = (index) => index % 2 ? '.pull-right' : '.pull-left';
let moveOrNot = (tiles) => tiles.length === 0 ? '.nomove' : '.move-mosaic';


function splitIntoSpreads(spreads, page) {
  if (!spreads.length) {
    spreads.push([page]);
  } else if (spreads.length === 1) {
    spreads.push([blankpage, page]);
  } else if(spreads.length && spreads[spreads.length-1].length < 2) {
    spreads[spreads.length-1].push(page);
  } else {
    spreads.push([page]);
  }
  return spreads;
}

function percent(x) { return x * 100 + "%"; }

function renderTile(tile, tileindex, index) {
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
    'src': "/storage/thumbs/"+tile.hash,
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
  return page.tiles.length === 0 ?
      h('.nocover', h('h6.cover-message.center', "Select images from the album to appear on the cover.")) :
      h('input.cover-title#album-title', {'type': 'text', 'placeholder': 'Click here to change the album title...', 'maxLength': 50, 'value': title, 'autocomplete': 'off'})
      // h('.cover-title', title ? title : h('span.text-muted', 'Click here to change the album title'))
}

let renderBackside = () => {
  return h('.backside', "Empty page");
}


let renderPage = (photos, title, j) => (page, i) => {
  return h('.box-mosaic' + leftOrRight(j*2+i) + moveOrNot(page.tiles),
      {'data-page': page.index},
      [].concat(
        page.tiles
        .map(t => _.extend(t, {hash: photos[t.photoID]}))
        .map((tile, index) => renderTile(tile, index, page.index)))
      .concat((page.index === 0) ? renderCover(title, page) : [])
      .concat((j === 1 && i === 0) ? renderBackside() : [])
  );
}

let renderBtn = (ui, j) => (page, i) => {
  let p = j*2+i;
  return h(leftOrRight(p), [
      h('span.page', {'data-page': page.index}, p === 0 ? 'Cover page ' : "Page "+(p-1)+' '),
      page.tiles.length ? h('.btn-group', [
        h('button.btn.btn-primary.btn-xs.shuffle-btn', {'data-page': page.index}, [h('i.fa.fa-refresh'), " Shuffle"]),
        h('button.btn.btn-primary.btn-xs.incr-btn', {'data-page': page.index}, [h('i.fa.fa-plus'), " More"]),
        h('button.btn.btn-primary.btn-xs.decr-btn', {'data-page': page.index}, [h('i.fa.fa-minus'), " Less"])
      ]) : ''
  ])
}

let renderSpread = (photos, ui, title) => (spread, i) => {
  return h('.spread' + ((spread.length === 1 && spread[0].index == 0) ? '.spread-cover' : ''), [
      h('.spread-paper.shadow.clearfix', spread.map(renderPage(photos, title, i))), 
      h('.spread-btn.clearfix', spread.map(renderBtn(ui, i)))
  ]);
}

function renderAlbum(album, photos, ui, title) {
  return album
    .reduce(splitIntoSpreads, [])
    .map(renderSpread(photos, ui, title));
}



function intent(DOM, HTTP) {
  return {
    createdAlbum$: jsonPOST(HTTP, /\/collections\/\d+\/pages\?startindex=.*/),
    downloadedAlbum$: jsonPOSTResponse(HTTP, /\/collections\/\d+\/download/),
    shuffledPage$: jsonPOST(HTTP, /\/collections\/\d+\/page\/\d+\?index=.*/),
    savedPage$: jsonPOST(HTTP, /\/save/),
    shuffle$: helpers.btn(DOM, '.shuffle-btn').map(ev => ev.target['data-page']),
    incrPhotos$: helpers.btn(DOM, '.incr-btn').map(ev => ev.target['data-page']),
    decrPhotos$: helpers.btn(DOM, '.decr-btn').map(ev => ev.target['data-page']),
    addPhotoCover$: helpers.btn(DOM, '.cover-btn').map(ev => ev.target['data-id']),
  }
}


function model(DOMactions, actions, collection, composition) {
  actions.downloadedAlbum$.subscribe(res => {
    window.open("/storage/generated/" + res.text);
  });

  let demoAlbum$ = collection.actions.storedAlbum$
    .map(demo => _.sortBy(demo.pages, 'index'))
    // .map(pages => (pages[0].index === 0) ? pages : [].concat(pages))
    .map(pages => album => pages);

  let albumUpdated$ = actions.createdAlbum$
    // .filter(pages => pages[0].index > 0)
    .map(newpages => album => album.concat(newpages).sort(ascIndex));

  let clearAlbum$ = DOMactions.reset$
    .map(x => item => []);

  let createdCover$ = actions.createdAlbum$
    .filter(pages => pages[0].index === 0)
    .map(pages => pages[0]);

  let albumPageShuffled$ = actions.shuffledPage$.merge(createdCover$)
    .map(page => album => { album[page.index] = page; return album; });

  return Observable.merge(albumUpdated$, clearAlbum$, demoAlbum$, albumPageShuffled$, composition.state$)
    .startWith([])
    .scan(apply)
    .map(album => album.sort((a,b) => a.index-b.index))
    .shareReplay(1);//.do(x => console.log(x));
}


function requests(DOMactions, actions, album$, collection, photos, upload) {

  let photosFromTiles = (photos, tiles) => _.filter(photos, p => _.where(tiles, {'photoID': p.id}).length > 0);

  let addOrRemove = (array, item) =>
    _.isUndefined(item) ? array :
      ((array.map(p => p.id).indexOf(item.id) === -1) ?
        array.concat(item) : array.filter(el => el.id !== item.id));

  let getOtherPage = (page1, N) =>  {
    let page2 = (page1 % 2) ? page1 - 1 : page1 + 1;
    return page2 < 1 ? page2 + 2 : (page2 >= N ? page2 - 2 : page2);
  }

  return {
    createAlbum$: upload.actions.uploadedFiles$.withLatestFrom(collection.state$, album$, photos.state$,
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

    shufflePage$: actions.shuffle$.withLatestFrom(collection.state$, photos.state$, album$,
        (page, collection, photos, album) => ({
          url: '/collections/'+collection.id+'/page/'+album[page].id+'?index='+page,
          method: 'POST',
          send: photosFromTiles(photos, album[page].tiles)
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



function view(albumState$, photosState$, uiState$, collectionState$) {
  let photosDict$ = photosState$.map(helpers.hashMap);
  return albumState$.combineLatest(photosDict$, uiState$, collectionState$,
      (album, photos, ui, collection) => {
        return album.length > 1 ?
        h('div.container-fluid.album', renderAlbum(album, photos, ui, collection.name)) :
        undefined
      }
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


module.exports = function(DOM, HTTP, DOMactions, collection, photos, upload, composition) {
  let actions = intent(DOM, HTTP);
  let state$ = model(DOMactions, actions, collection, composition);
  let req = requests(DOMactions, actions, state$, collection, photos, upload);
  let ui$ = uiModel(DOM);
  let vtree$ = view(state$, photos.state$, ui$, collection.state$);

  return {
    DOM: vtree$,
    HTTP: req,
    state$,
    actions
  }
}
