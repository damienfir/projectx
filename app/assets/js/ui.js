import {Rx} from '@cycle/core';
import {h} from '@cycle/dom';
import _ from 'underscore';
// import Immutable from 'immutable';


var UI = {
  initial: 1 << 0,
  uploadBox: 1 << 1,
  uploading: 1 << 2,
  processing: 1 << 3
}


function leftOrRight(index) { return index % 2 ? '.pull-right' : '.pull-left'; }


function renderButton() {
  return h('.start-buttons', [
      h('button.btn.btn-default.btn-lg#create-btn', [
        h('i.fa.fa-book.fa-3x'),
        'Create album'
      ]), 
      h('span.or', 'or'),
      h('button.btn.btn-success.btn-lg#demo-btn', [
        h('i.fa.fa-rocket.fa-3x'),
        'View demo'
      ])
  ]);
}

function renderToolbar(collection, album) {
  return h('div.navbar.navbar-default.navbar-static-top', [
      h('div.container-fluid', [
        h('ul.nav.navbar-nav', [
          h('li',
            h('button.btn.btn-default.navbar-btn#upload-btn', [
              h('i.fa.fa-cloud-upload'), ' Add photos'])),
          !_.isEmpty(collection) ? h('li',
            h('button.btn.btn-default.navbar-btn#reset-btn', [
              h('i.fa.fa-refresh'), ' Reset'])) : '',
          (album && album.length) ? h('li',
            h('button.btn.btn-default.navbar-btn#download-btn', [
              h('i.fa.fa-cloud-download'), ' Download album'])) : ''
        ])
      ]),
      h('input#file-input', {'type': "file", 'name': "image", 'multiple': true})
    ]);
}


function renderUploadArea(ui, upload) {
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

  if (ui & UI.uploadBox) {
    return h('div.upload-area#upload-area', [
      (ui & UI.uploading) ? renderProgressbar(upload) : '',
      message(ui)
    ]);
  }
}


function renderProgressbar(upload) {
  let progress = (upload.files && upload.size) ? 100 * upload.files.length / upload.size : 0;
  return h('div.progressbar',
      h('div', {
        style: {'width': progress + "%"}
      }));
}


function renderTile(tile, tileindex, index, photos) {
  function percent(x) { return x * 100 + "%"; }
  // function getFilename(path) { return path.split('/').pop() }

  var scaleX = 1 / (tile.cx2 - tile.cx1);
  var scaleY = 1 / (tile.cy2 - tile.cy1);

  return h('.ui-tile', {'style': {
    height: percent(tile.ty2 - tile.ty1),
    width: percent(tile.tx2 - tile.tx1),
    top: percent(tile.ty1),
    left: percent(tile.tx1)
  }},
  h('img', {
    'src': "/storage/photos/"+tile.hash,
    'draggable': false,
    'style': {
      height: percent(scaleY),
      width: percent(scaleX),
      top: percent(-tile.cy1 * scaleY),
      left: percent(-tile.cx1 * scaleX)
    },
    'data-page': index,
    'data-idx': tileindex}));
}


function renderFrontpage() {
  return h('.box-mosaic',
          h('div.ui-composition.shadow', "front page"));
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


let renderSpread = (photos) => (spread) => {
  // let shuffling = (state.ui & UI.shuffling && state.edit.shuffling == index);
  return h('.spread', [
      h('.spread-paper.shadow.clearfix', spread.map(renderPage(photos))),
      h('.pages.clearfix', spread.map(({index}) =>
          h('span.page-btns' + leftOrRight(index), [
            h('span.page'+leftOrRight(index), "Page "+(index+1)),
            h('button.btn.btn-default.btn-sm.shuffle-btn', {'data-page': index}, [h('i.fa.fa-refresh'), " Shuffle"])
          ])))
  ]);
}

function renderAlbum(album, photos) {
  return album
    .reduce(splitIntoSpreads, [])
    .map(renderSpread(photos));
}


module.exports = {UI, renderToolbar, renderUploadArea, renderAlbum, renderButton}
