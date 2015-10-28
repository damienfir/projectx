import {Rx} from '@cycle/core';
import {h} from '@cycle/dom';
// import _ from 'underscore';
import {UI} from './helpers'
// import Immutable from 'immutable';



function renderToolbar(collection, album) {
  return h('div.navbar.navbar-transparent.navbar-static-top', [
      h('div.container-fluid', [
        h('ul.nav.navbar-nav', [
          h('li',
            h('button.btn.btn-primary.navbar-btn#upload-btn', [
              h('i.fa.fa-cloud-upload'), 'Add photos'])),
          !_.isEmpty(collection) ? h('li',
            h('button.btn.btn-default.navbar-btn#reset-btn', [
              h('i.fa.fa-refresh'), 'New album'])) : '',
        ]),
        (album && album.length) ?  h('form.navbar-form.navbar-right', [
          h('.form-group',
            h('input.form-control#album-title', {'type': 'text', 'placeholder': 'Album title...'})),
            h('button.btn.btn-primary#download-btn', [
              h('i.fa.fa-cloud-download'), 'Download album']),
            h('button.btn.btn-primary#order-btn', [
              h('i.fa.fa-shopping-cart'), 'Order album']),
            h('button.btn.btn-primary#save-btn', [
              h('i.fa.fa-cloud-download'), 'Save album']),
            h('a.btn.btn-link', {'href': '/ui/'+collection.id}, 'Permanent link')
        ]) : ''
      ]),
      h('input#file-input', {'type': "file", 'name': "image", 'multiple': true})
    ]);
}


function renderUploadArea(ui, upload) {
  let message = ui => {
    if (ui & (UI.uploading | UI.processing))
      return h('.message', [
          (ui & UI.processing) ? "processing" : "uploading...",
          renderProgressbar(upload)])
    else
      return h('.message', [
          h('i.fa.fa-2x.fa-cloud-upload'),
          h('br'),
          ' drag files or click to upload'
        ])
  }

  if (ui.state & UI.uploadBox) {
    return h('div.upload-area#upload-area', [
      message(ui.state)
    ]);
  } else return '';
}


function renderProgressbar(upload) {
  let progress = (upload.files && upload.size) ? 100 * upload.files.length / upload.size : 0;
  return h('div.progress',
        h('div.progress-bar', {
          style: {'width': progress + "%"}
        }));
}


function renderFrontpage() {
  return h('.box-mosaic',
          h('div.ui-composition.shadow', "front page"));
}


module.exports = {renderToolbar, renderUploadArea}
