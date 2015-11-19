import Rx from 'rx';
import {h} from '@cycle/dom';
import helpers from './helpers'



function renderToolbar(collection, album, upload) {
  let loaded = album && album.length > 1 && collection.id !== helpers.demoID;
  return h('div.navbar.navbar-transparent.navbar-static-top', [
      h('div.container-fluid', [

        loaded ? 
          h('ul.nav.navbar-nav', [
            h('li',
              h('button.btn.btn-primary.navbar-btn#upload-btn', [
                h('i.fa.fa-cloud-upload'), 'Add more photos'])),
            h('li',
              h('button.btn.btn-primary.navbar-btn#reset-btn', [
                h('i.fa.fa-refresh'), ' New album'])),
          ]) : '',

        collection.id === helpers.demoID ? h('.ul.nav.navbar-nav', [
          h('li',
            h('button.btn.btn-primary.navbar-btn#reset-btn', [
              h('i.fa.fa-angle-left'), ' Back'
            ]))
        ]) : '',
          
        h('ul.nav.navbar-nav', renderProgressbar(upload)),

        loaded ?
          h('ul.nav.navbar-nav.navbar-right', [
            // h('li.navbar-form',
              // h('input.form-control.input-blue#album-title',
              //   {'type': 'text', 'placeholder': 'Album title...', 'value': collection.name, 'autocomplete': 'off'})),
              // h('li', h('button.btn.btn-primary.navbar-btn#download-btn', [
              //   h('i.fa.fa-cloud-download'), 'Download album'])),
              h('li', h('button.btn.btn-primary.navbar-btn#save-btn', [
                h('i.fa.fa-heart-o'), 'Save for later'])),
              h('li', h('button.btn.btn-primary.navbar-btn#order-btn', [
                h('i.fa.fa-shopping-cart'), 'Order album'])),
          ]) : ''
      ]),

      h('input#file-input', {'type': "file", 'name': "image", 'multiple': true}),
    ]);
}


function renderButton() {
  return h('.start-buttons', [
      h('.step1', "Step 1."),
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


module.exports = {renderToolbar, renderButton}
