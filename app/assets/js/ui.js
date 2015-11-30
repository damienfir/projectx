import Rx from 'rx';
import {h} from '@cycle/dom';
import helpers from './helpers'



export function renderToolbar(collection, album, upload) {
  let loaded = album && album.length > 1 && collection.id !== helpers.demoID && collection.name !== null;
  return h('div.navbar.navbar-transparent.navbar-static-top', [
      h('div.container-fluid', [

        loaded ? 
          h('ul.nav.navbar-nav', [
            h('li',
              h('button.btn.btn-primary.navbar-btn#upload-btn', [
                h('i.fa.fa-cloud-upload'), 'Add more photos'])),
            h('li',
              h('button.btn.btn-primary.navbar-btn#reset-btn', [
                h('i.fa.fa-refresh'), ' Start over'])),
            // h('li',
            //   h('button.btn.btn-primary.navbar-btn#undo-btn', [
            //     h('i.fa.fa-undo'), ' Undo'])),
            // h('li',
            //   h('button.btn.btn-primary.navbar-btn#redo-btn', [
            //     h('i.fa.fa-undo'), ' Redo'])),
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


export function renderStartPage(collection) {
  return h('.container.start-buttons', [
      h('.steps' + (!_.isUndefined(collection.id) ? '.step-disabled' : ''), [
        h('.step1', "Step 1."),
        h('button.btn.btn-primary.btn-lg.btn-step#create-btn', {
          disabled: !_.isUndefined(collection.id)
        }, [
          h('i.fa.fa-book.fa-3x'),
          'Upload multiple photos'
        ])
      ]), 
      h('.steps' + (_.isUndefined(collection.id) ? '.step-disabled' : ''), [
        h('.step2', "Step 2."),
        h('.form-inline', [
          h('.form-group', [
            h('input.form-control.input-lg.shadow.step2-title#album-title-front', {
              disabled: _.isUndefined(collection.id),
              type: 'text',
              placeholder: 'Type your album title',
              maxLength: 50,
              autocomplete: 'off'
            })
          ]),
          h('button.btn.btn-info.shadow#title-btn',  h('i.fa.fa-arrow-right'))
        ])
      ])
  ]);
}



function renderProgressbar(upload) {
  if (upload.get('size', 0) > 0) {
    let progress = (upload.get('files') && upload.get('size')) ? 100 * upload.get('files').size / upload.get('size') : 0;
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
