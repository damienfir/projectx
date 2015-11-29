import Rx from 'rx';
import {h} from '@cycle/dom';
import {apply, argArray, asc, ascIndex, initial, jsonPOST, jsonPOSTResponse, cancelDefault} from './helpers'
import helpers from './helpers'
import * as utils from './utils'
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


let splitIntoSpreads = (spreads, page) => {
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


let percent = (x) => x*100 + "%"

let renderTile = (tile, tileindex, page, editing) => {
  var scaleX = 1 / (tile.cx2 - tile.cx1);
  var scaleY = 1 / (tile.cy2 - tile.cy1);

  let selectedClass = editing.selected ?
    (editing.selected.page === page && editing.selected.idx === tileindex ? '.tile-selected' : '.tile-unselected') : '';

  return h('.ui-tile' + selectedClass,
      _.extend({
        'style': {
        height: percent(tile.ty2 - tile.ty1),
        width: percent(tile.tx2 - tile.tx1),
        top: percent(tile.ty1),
        left: percent(tile.tx1)
        },
        'data-page': page,
        'data-idx': tileindex
      },
      (editing.selectedTile ? {} : {'attributes' : {
          'data-toggle': 'tooltip',
          'data-placement': 'top',
          'title': "Click"
        }
      })
      ), [
          h('img' + (tile.rot ? '.rotate'+tile.rot : ''), {
            'src': "/storage/thumbs/"+tile.hash,
            'draggable': false,
            'style': {
              height: percent(scaleY),
              width: percent(scaleX),
              top: percent(-tile.cy1 * scaleY),
              left: percent(-tile.cx1 * scaleX)
            }}),
          // (editing.selected &&
          //  editing.selected.page == page &&
          //  editing.selected.idx !== tileindex) ? h('h2.center', "Swap photo") : ''
  // h('button.btn.btn-danger.delete-btn', h('i.fa.fa-ban'))
    // h('button.btn.btn-primary.hover-btn.cover-btn',
    //   {'data-id': tile.photoID},
    //   (page === 0) ? h('i.fa.fa-minus') : h('i.fa.fa-plus'))
  ]);
}


let renderCover = (title, page) => {
  return page.tiles.length === 0 ?
      h('.nocover',
          h('h6.cover-message.center', "Select images from the album to appear on the cover.")) :
      h('input.cover-title#album-title',
          {
            'type': 'text',
            'placeholder': 'Click here to change the album title...',
            'maxLength': 50,
            'value': title,
            'autocomplete': 'off'
          })
}


let renderBackside = () => {
  return h('.backside', "Empty page");
}

let renderHover = (editing, page) => 
  (editing.selected && editing.selected.page !== page.index) ?
    h('.page-hover', {'data-page': page.index, 'data-idx': 0}, h('h2.center', "Move photo to this page")) : ''


let Node = (x,y) => ({x,y});

let drawNode = (shift, dragged) => (node, key) => h('button.node.shadow', _.extend({
  // key,
  style: {
      'top': percent(node.y + shift),
      'left': percent(node.x + shift),
    }
  },
  dragged ? {} : {'attributes': {
    'data-toggle': 'tooltip',
    'data-placement': 'top',
    'title': 'Drag'
  }}
  ), ' ');

let shift = 0.2e-2;

let renderNodes = (page, editing) => {
  let topleft = page.tiles
    .filter(t => t.tx1 > 0.01 || t.ty1 > 0.01)
    .map(t => Node(t.tx1, t.ty1));
  let bottomright = page.tiles
    .filter(a => topleft
        .filter(b => a.tx1 === b.x && a.ty1 === b.y).length === 0)
    .filter(t => t.tx2 < 0.99 || t.ty2 < 0.99)
    .map(t => Node(t.tx2, t.ty2))
    .filter(a => topleft
        .filter(b => (Math.abs(a.x-b.x) + Math.abs(a.y-b.y)) < 0.1).length === 0);
  return bottomright.map(drawNode(shift, editing.draggedNode))
    .concat(topleft.map(drawNode(shift, editing.draggedNode)));
}


let renderPage = (photos, title, j, editing) => (page, i) => {
  return h('.box-mosaic' + leftOrRight(j*2+i) + moveOrNot(page.tiles),
      {'data-page': page.index}, [
        (j === 1 && i === 0) ? renderBackside() :
          page.tiles
            .map(t => _.extend(t, {hash: photos[t.photoID]}))
            .map((tile, index) => renderTile(tile, index, page.index, editing))
        .concat((page.index === 0) ? renderCover(title, page) : undefined)
        .concat(renderHover(editing, page))
        .concat(renderToolbar(editing, page))
        .concat(renderNodes(page, editing))
      ]);
}

let renderToolbar = (editing, page) => {
  return (editing.selected && editing.selected.page === page.index) ?
          h('.btn-group.toolbar', [
            h('button.btn.btn-info.btn-lg#remove-btn',
              {'attributes': {
                'data-toggle': 'tooltip',
                'data-placement': 'top',
                'title': 'Remove image'
              }},
              h('i.fa.fa-trash-o')),
            // h('li', h('button.btn.btn-warning.navbar-btn#rotate-btn', [h('i.fa.fa-rotate-right')])),
            editing.selected.page !== 0 ? h('button.btn.btn-info.btn-lg#add-cover-btn', {'attributes': {
                'data-toggle': 'tooltip',
                'data-placement': 'top',
                'title': 'Add to album cover'
              }},
              [h('i.fa.fa-book')]) : '',
            h('button.btn.btn-info.btn-lg#cancel-btn', {'attributes': {
                'data-toggle': 'tooltip',
                'data-placement': 'top',
                'title': 'Cancel'
              }}, [h('i.fa.fa-times')])
        ]) : ''
}

let renderBtn = (j) => (page, i) => {
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


let renderSpread = (photos, title, editing) => (spread, i) => {
  let cover = (spread.length === 1 && spread[0].index == 0) ?
      '.spread-cover' + (editing.selected ? '' : '.spread-cover-unselected') :
      '';

  return h('.spread' + cover, [
      h('.spread-paper.shadow.clearfix', spread.map(renderPage(photos, title, i, editing))), 
      h('.spread-btn.clearfix', spread.map(renderBtn(i)))
  ]);
}


function renderAlbum(album, photos, title, editing) {
  return album
    .reduce(splitIntoSpreads, [])
    .map(renderSpread(photos, title, editing));
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


let params = [];


function model(DOMactions, actions, collection, editing) {
  actions.downloadedAlbum$.subscribe(res => {
    window.open("/storage/generated/" + res.text);
  });

  let demoAlbum$ = collection.actions.storedAlbum$
    .map(demo => _.sortBy(demo.pages, 'index'))
    .map(pages => album => pages);

  let albumUpdated$ = actions.createdAlbum$
    .map(newpages => album => album.concat(newpages).sort(ascIndex));

  let clearAlbum$ = DOMactions.reset$
    .map(x => item => []);

  let createdCover$ = actions.createdAlbum$
    .filter(pages => pages[0].index === 0)
    .map(pages => pages[0]);

  let albumPageShuffled$ = actions.shuffledPage$.merge(createdCover$)
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

  let removeTile$ = editing.actions.remove$.withLatestFrom(album$, photos.state$, editing.state$, (ev, album, photos, {selected}) => ({
    page: selected.page,
    photos: photosFromTiles(photos, album[selected.page].tiles)
      .filter(p => p.id !== album[selected.page].tiles[selected.idx].photoID)
  }));

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



function view(album$, photos$, collection$, editing$) {
  let photosDict$ = photos$.map(helpers.hashMap);
  return album$.combineLatest(photosDict$, collection$, editing$,
      (album, photos, collection, editing) => {
        return album.length > 1 && collection.name !== null ?
        h('div.container-fluid.album', renderAlbum(album, photos, collection.name, editing)) :
        undefined
      }
    );
}


module.exports = function(DOM, HTTP, DOMactions, collection, photos, upload, editing) {
  let actions = intent(DOM, HTTP);
  let state$ = model(DOMactions, actions, collection, editing);
  let req = requests(DOMactions, actions, state$, collection, photos, upload, editing);
  let vtree$ = view(state$, photos.state$, collection.state$, editing.state$);

  return {
    DOM: vtree$,
    HTTP: req,
    state$,
    actions
  }
}
