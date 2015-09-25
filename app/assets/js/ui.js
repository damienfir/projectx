import {Rx} from '@cycle/core';
import {h} from '@cycle/dom';
import _ from 'underscore';


var UI = {
  initial: 1 << 0,
  uploadBox: 1 << 1,
  uploading: 1 << 2,
  processing: 1 << 3
}


function leftOrRight(index) { return index % 2 ? '.pull-right' : '.pull-left'; }

function renderToolbar(state) {
  return h('div.navbar.navbar-default.navbar-static-top', [
      h('div.container-fluid', [
        h('ul.nav.navbar-nav', [
          h('li',
            h('button.btn.btn-default.navbar-btn#upload-btn', {type: 'button'}, [
              h('i.fa.fa-cloud-upload'), ' Upload photos'])),
          state.album.length ? h('li',
            h('button.btn.btn-default.navbar-btn#download-btn', [
              h('i.fa.fa-cloud-download'), ' Download'])) : ''
        ])
      ]),
      h('input#file-input', {'type': "file", 'name': "image", 'multiple': true})
    ]);
}


function renderUploadArea(state) {
  let message = ui => {
    if (ui & UI.uploading)
      return h('h4', "uploading...")
    else if (ui & UI.processing)
      return h('h4', "processing...")
    else
      return h('h4', [
          h('i.fa.fa-2x.fa-cloud-upload'),
          h('br'),
          ' drag files or click to upload'
        ])
  }

  let ui = state.ui;
  if (ui & UI.uploadBox) {
    return h('div.upload-area#upload-area', [
      renderProgressbar(state),
      message(ui)
    ]);
  }
}


function renderProgressbar({collection}) {
  let progress = collection.photos ? 100 * collection.photos.length / collection.nphotos : 0;
  return h('div.progressbar',
      h('div', {
        style: {'width': progress + "%"}
      }));
}


function renderTile(tile, index) {
  function percent(x) { return x * 100 + "%"; }
  function getFilename(path) { return path.split('/').pop() }

  var scaleX = 1 / (tile.cx2 - tile.cx1);
  var scaleY = 1 / (tile.cy2 - tile.cy1);

  return h('.ui-tile', {'style': {
    height: percent(tile.ty2 - tile.ty1),
    width: percent(tile.tx2 - tile.tx1),
    top: percent(tile.ty1),
    left: percent(tile.tx1)
  }},
  h('img', {
    'src': "/storage/photos/"+getFilename(tile.img),
    'draggable': false,
    'style': {
      height: percent(scaleY),
      width: percent(scaleX),
      top: percent(-tile.cy1 * scaleY),
      left: percent(-tile.cx1 * scaleX)
    },
    'data-page': index,
    'data-idx': tile.tileindex}));
}


function renderFrontpage() {
  return h('.box-mosaic',
          h('div.ui-composition.shadow', "front page"));
}

function renderPage(page) {
  return h('.box-mosaic' + leftOrRight(page.index),
      {'data-page': page.index},
      page.tiles.map(tile => renderTile(tile, page.index)))
}

function splitIntoSpreads(spreads, page) {
  if(spreads.length && spreads[spreads.length-1].length < 2) {
    spreads[spreads.length-1].push(page);
  } else {
    spreads.push([page]);
  }
  return spreads;
}

function renderSpread(spread) {
  return h('.spread', [
      h('.spread-paper.shadow.clearfix', spread.map(renderPage)),
      h('.pages.clearfix', spread.map(({index}) =>
          h('span' + leftOrRight(index), "page "+(index+1))))
  ]);
}

function renderAlbum(album) {
  return album
    .reduce(splitIntoSpreads, [])
    .map(renderSpread);
}


function view(state$) {
  return state$.map(state => 
      h('div', [
        renderToolbar(state),
        renderUploadArea(state),
        h('div.container-fluid.limited-width.album', 
          renderAlbum(state.album)
        )
      ])
  );
}


function model(actions, requests$) {
  let uploadBox$ = actions.toggleUpload$.map(f => ui => ui ^ UI.uploadBox);
  let uploading$ = actions.uploadFiles$.map(f => ui => (ui ^ UI.uploading) & ~UI.processing);
  let processing$ = requests$.compositionRequest$.map(f => ui => (ui ^ UI.processing) & ~UI.uploading);
  let complete$ = actions.compositionResponse$.map(f => ui => ui & ~(UI.uploading | UI.processing | UI.uploadBox));

  return Rx.Observable.merge(uploadBox$, uploading$, processing$, complete$)
    .startWith(UI.initial)
    .scan((ui,func) => func(ui));
}

module.exports = {view, model}
