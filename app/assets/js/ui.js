import {Rx} from '@cycle/core';
import {h} from '@cycle/dom';
// import _ from 'underscore';
import {UI} from './helpers'
// import Immutable from 'immutable';



function renderToolbar(collection, album, upload, ui) {
  return h('div.navbar.navbar-transparent.navbar-static-top', [
      h('div.container-fluid', [

        !_.isEmpty(collection) ? 
          h('ul.nav.navbar-nav', [
            h('li',
              h('button.btn.btn-primary.navbar-btn#upload-btn', [
                h('i.fa.fa-cloud-upload'), 'Add photos'])),
            h('li',
              h('button.btn.btn-default.navbar-btn#reset-btn', [
                h('i.fa.fa-refresh'), 'New album'])),
          ]) : '',

        (album && album.length > 1) ?
          h('form.navbar-form.navbar-right', [
            h('.form-group',
              h('input.form-control#album-title', {'type': 'text', 'placeholder': 'Album title...', 'value': collection.name})),
              h('button.btn.btn-primary#download-btn', [
                h('i.fa.fa-cloud-download'), 'Download album']),
              h('button.btn.btn-primary#order-btn', [
                h('i.fa.fa-shopping-cart'), 'Order album']),
              h('button.btn.btn-primary#save-btn', [
                h('i.fa.fa-cloud-download'), 'Save album']),
              h('a.btn.btn-link', {'href': '/ui/'+collection.id}, 'Permanent link')
          ]) : ''
      ]),

      h('input#file-input', {'type': "file", 'name': "image", 'multiple': true}),

      (ui & (UI.uploading | UI.processing)) ?
        renderProgressbar(upload) : ''
    ]);
}


function renderUploadArea() {
  return h('.modal.fade#upload-modal',
      h('.modal-dialog',
        h('.modal-content#upload-area',
          h('.modal-body', [h('.message', "Drag to upload or click here"), h('.fa.fa-download.fa-3x')]))));
}


function renderProgressbar(upload) {
  let progress = (upload.files && upload.size) ? 100 * upload.files.length / upload.size : 0;
  return h('.progress',
        h('.progress-bar', {
          style: {'width': progress + "%"}
        }));
}


function renderFrontpage() {
  return h('.box-mosaic',
          h('div.ui-composition.shadow', "front page"));
}


module.exports = {renderToolbar, renderUploadArea}
