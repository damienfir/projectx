import {h} from '@cycle/dom';
import helpers from '../helpers'


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
          // 'data-toggle': 'tooltip',
          // 'data-placement': 'top',
          // 'title': "Click"
        }
      })), [
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
        renderToolbar(editing, page, tileindex)
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
  {}
  // dragged ? {} : {'attributes': {
  //   'data-toggle': 'tooltip',
  //   'data-placement': 'top',
  //   'title': 'Drag'
  // }}
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
        .concat(renderNodes(page, editing))
      ]);
}


let renderToolbar = (editing, page, tileindex) => {
  return (editing.selected && editing.selected.page === page.index && editing.selected.idx === tileindex) ?
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
        // h('button.btn.btn-primary.btn-xs.incr-btn', {'data-page': page.index}, [h('i.fa.fa-plus'), " More"]),
        // h('button.btn.btn-primary.btn-xs.decr-btn', {'data-page': page.index}, [h('i.fa.fa-minus'), " Less"])
      ]) : ''
  ])
}


let renderSpread = (photos, title, editing) => (spread, i) => {
  let isCover = (spread.length === 1 && spread[0].index == 0);
  let cover = isCover ?
      '.spread-cover' + (editing.selected ? '' : '.spread-cover-unselected') :
      '';

  return h('.row.spread' + cover, [
      h('a.spread-anchor', {name: 'spread'+i}),
      isCover ? '' : h('.col-xs-1.spread-arrow',
        h('a.btn.btn-link', {href: '#spread'+(i-1)}, h('i.fa.fa-chevron-left.fa-3x'))),
      h('.spread-paper.shadow.clearfix' + (isCover ? '.col-xs-6.col-xs-offset-3' : '.col-xs-10'),
        spread.map(renderPage(photos, title, i, editing))), 
      h('.col-xs-1.spread-arrow',
        h('a.btn.btn-link', {href: '#spread'+(i+1)}, h('i.fa.fa-chevron-right.fa-3x'))),
      h('.spread-btn.clearfix' + (isCover ? '.col-xs-6.col-xs-offset-3' : '.col-xs-10.col-xs-offset-1'),
        spread.map(renderBtn(i))),
  ]);
}


function renderAlbum(album, photos, title, editing) {
  return album
    .reduce(splitIntoSpreads, [])
    .filter(spread => !_.some(spread, _.isEmpty))
    .map(renderSpread(photos, title, editing));
}


module.exports = function(album$, photos$, collection$, editing$) {
  let photosDict$ = photos$.map(helpers.hashMap);
  return album$.combineLatest(photosDict$, collection$, editing$,
      (album, photos, collection, editing) => {
        return album.length > 1 && collection.name !== null ?
        h('div.container-fluid.album', renderAlbum(album, photos, collection.name, editing)) :
        undefined
      }
    );
}