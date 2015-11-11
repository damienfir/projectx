import Rx from 'rx';
import {h} from '@cycle/dom';
import {UI} from './helpers'



function renderToolbar(collection, album, upload, ui) {
  return h('div.navbar.navbar-transparent.navbar-static-top', [
      h('div.container-fluid', [

        !_.isEmpty(collection) ? 
          h('ul.nav.navbar-nav', [
            h('li',
              h('button.btn.btn-primary.navbar-btn#upload-btn', [
                h('i.fa.fa-cloud-upload'), 'Add photos'])),
            h('li',
              h('button.btn.btn-primary.navbar-btn#reset-btn', [
                h('i.fa.fa-refresh'), 'New album'])),
          ]) : '',
          
        h('ul.nav.navbar-nav', renderProgressbar(upload)),

        (album && album.length > 1) ?
          h('ul.nav.navbar-nav.navbar-right', [
            // h('li.navbar-form',
              // h('input.form-control.input-blue#album-title',
              //   {'type': 'text', 'placeholder': 'Album title...', 'value': collection.name, 'autocomplete': 'off'})),
              h('li', h('button.btn.btn-primary.navbar-btn#download-btn', [
                h('i.fa.fa-cloud-download'), 'Download album'])),
              h('li', h('button.btn.btn-primary.navbar-btn#order-btn', [
                h('i.fa.fa-shopping-cart'), 'Order album'])),
          ]) : ''
      ]),

      h('input#file-input', {'type': "file", 'name': "image", 'multiple': true}),
    ]);
}


function renderButton() {
  return h('.start-buttons', [
      h('button.btn.btn-primary.btn-lg#create-btn', [
        h('i.fa.fa-book.fa-3x'),
        'Upload photos'
      ]), 
      h('span.or', 'or'),
      h('button.btn.btn-info.btn-lg#demo-btn', [
        h('i.fa.fa-rocket.fa-3x'),
        'View a demo'
      ])
  ]);
}


function renderUploadArea() {
  return h('.modal.fade#upload-modal',
      h('.modal-dialog',
        h('.modal-content#upload-area',
          h('.modal-body', [h('.message', "Drag to upload or click here"), h('.fa.fa-download.fa-3x')]))));
}


function renderProgressbar(upload) {
  if (upload.size) {
    let progress = (upload.files && upload.size) ? 100 * upload.files.length / upload.size : 0;
    return [
      h('li', 
        h('span.navbar-text', progress < 100 ? 'Uploading...' : 'Processing...')),
      h('li', 
        h('.progress.navbar-text',
          progress === 0 ?
          h('.progress-bar.progress-bar-info.progress-bar-striped.active', {style: {width: '100%'}}) :
          h('.progress-bar.progress-bar-info', {
            style: {'width': progress + "%"}
            // style: {'width': '50%'}
          })
        ))
      ];
    }
}


function renderFrontpage() {
  return h('.box-mosaic',
          h('div.ui-composition.shadow', "front page"));
}


function saveNotification(saveEvent$) {
  return Rx.Observable.merge(
    saveEvent$.map(h('.alert.alert-info.fade.in#save-alert', [h('i.fa.fa-check'), " Saved"])),
    saveEvent$.delay(2000).map(null)
  ).startWith(null);
}


module.exports = {renderToolbar, renderUploadArea, renderButton, saveNotification}
