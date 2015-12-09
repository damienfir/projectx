import {h} from '@cycle/dom';
import helpers from '../helpers'
import i18 from '../i18n'


let blankpage = {
  tiles: [],
  index: -2
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
        h('img', {
          'src': "/photos/"+tile.photoID+"/full/800,/0/default.jpg",
          'draggable': false,
          'style': {
            height: percent(scaleY),
            width: percent(scaleX),
            top: percent(-tile.cy1 * scaleY),
            left: percent(-tile.cx1 * scaleX)
          }}),
          // (editing.selected &&
          //  editing.selected.page === page &&
          // editing.selected.idx === tileindex) ? h('h2.center', "Click on") : ''
      ]);
}


let renderCover = (title, page) => {
  return h('input.cover-title#album-title', {
    'type': 'text',
    'placeholder': i18('ui.title'),
    'maxLength': 50,
    'value': title,
    'autocomplete': 'off',
    'style': {
      'font-size': $('.spread-cover .box-mosaic').width()/20+'px'
    }
  })
}


let renderBackside = () => {
  return h('.backside', "bigpiq");
}

let renderHover = (editing, page) => 
  (editing.selected && editing.selected.page !== page.index) ?
    h('.page-hover', {'data-page': page.index, 'data-idx': 0}, h('h2.center', i18('ui.move'))) : ''


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

let shift = 0.3e-2;

let renderNodes = (page, editing) => {
  let topleft = page.tiles
    .filter(t => t.tx1 > 0.01 || t.ty1 > 0.01)
    .map(t => Node(t.tx1, t.ty1));
  let bottomright = page.tiles
    // .filter(a => topleft
    //     .filter(b => a.tx1 === b.x && a.ty1 === b.y).length === 0)
    .filter(t => t.tx2 < 0.99 || t.ty2 < 0.99)
    .map(t => Node(t.tx2, t.ty2))
    .filter(a => topleft
        .filter(b => (Math.abs(a.x-b.x) + Math.abs(a.y-b.y)) < 0.1).length === 0);
  return bottomright.map(drawNode(shift, editing.draggedNode))
    .concat(topleft.map(drawNode(-shift, editing.draggedNode)));
}


let renderAddPhotos = (page) => {
  return page.tiles.length ? '' : h('.newpage', h('button.btn.btn-primary.center#addmore-btn', [
      h('i.fa.fa-cloud-upload'), ' '+i18('ui.add')]))
}


let renderPage = (photos, title, j, editing) => (page, i) => {

  return h('.box-mosaic' + leftOrRight(j*2+i),
      {'data-page': page.index}, [
        (j === 1 && i === 0) ? renderBackside() :
          page.tiles
            .map((tile, index) => renderTile(tile, index, page.index, editing))
        .concat((page.index === 0) ? renderCover(title, page) : undefined)
        .concat(renderNodes(page, editing))
        .concat(renderAddPhotos(page))
        .concat(renderHover(editing, page))
        .concat(renderToolbar(editing, page.index))
      ]);
}


let renderToolbar = (editing, page, tileindex) => {
  return (editing.selected && editing.selected.page === page) ?// && editing.selected.idx === tileindex) ?
          h('.btn-group.toolbar', [
            h('button.btn.btn-info.btn-lg#remove-btn',
              {'attributes': {
                'data-toggle': 'tooltip',
                'data-placement': 'top',
                'title': i18('toolbar.remove')
              }},
              h('i.fa.fa-trash-o')),
            // h('li', h('button.btn.btn-warning.navbar-btn#rotate-btn', [h('i.fa.fa-rotate-right')])),
            editing.selected.page !== 0 ? h('button.btn.btn-info.btn-lg#add-cover-btn', {'attributes': {
                'data-toggle': 'tooltip',
                'data-placement': 'top',
                'title': i18('toolbar.cover')
              }},
              [h('i.fa.fa-book')]) : '',
            h('button.btn.btn-info.btn-lg#cancel-btn', {'attributes': {
                'data-toggle': 'tooltip',
                'data-placement': 'top',
                'title': i18('toolbar.cancel')
              }}, [h('i.fa.fa-times')])
        ]) : ''
}


let renderBtn = (j) => (page, i) => {
  let p = j*2+i;
  return h(leftOrRight(p), [
      h('span.page', {'data-page': page.index}, (p === 0 ? i18('ui.cover') : i18('ui.page')+" "+(p-1))+' '),
      page.tiles.length>1 ? h('.btn-group', [
        h('button.btn.btn-primary.shuffle-btn', {'data-page': page.index}, [h('i.fa.fa-refresh'), " "+i18('ui.shuffle')]), 
        // h('button.btn.btn-primary.btn-xs.incr-btn', {'data-page': page.index}, [h('i.fa.fa-plus'), " More"]),
        // h('button.btn.btn-primary.btn-xs.decr-btn', {'data-page': page.index}, [h('i.fa.fa-minus'), " Less"])
      ]) : ''
  ])
}


let renderSpread = (photos, title, editing) => (spread, i) => {
  let isCover = (spread.length === 1 && spread[0].index == 0);
  let cover = isCover ?
      '.spread-cover' :// + (editing.selected ? '' : '.spread-cover-unselected') :
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
  let spreads = album
    .reduce(splitIntoSpreads, []);

  if (_.last(spreads).length < 2) {
    spreads[spreads.length-1] = spreads[spreads.length-1].concat(blankpage);
  } else {
    spreads = spreads.concat([[blankpage]]);
  }

  return spreads.filter(spread => !_.some(spread, _.isEmpty))
    .map(renderSpread(photos, title, editing));
}


module.exports = function(album$, photos$, collection$, editing$) {
  let photosDict$ = photos$.map(helpers.hashMap);
  return album$.combineLatest(photosDict$, collection$, editing$,
      (album, photos, collection, editing) => {
        // console.log(album);
        // console.log(collection);
        return album.length > 1 && collection.name !== null ?
        h('div.container-fluid.album', renderAlbum(album, photos, collection.name, editing)) :
        undefined
      }
    );
}
