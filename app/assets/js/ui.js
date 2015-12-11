import Rx from 'rx';
import {h} from '@cycle/dom';
import helpers from './helpers';
import i18 from './i18n';



export function renderToolbar(collection, album, upload) {
  let loaded = album && album.length > 1 && collection.hash !== helpers.demoID && collection.name !== null;
  // console.log(collection);
  // console.log(album);
  return h('div#nav.navbar.navbar-transparent.navbar-fixed-top', [
      h('div.container-fluid', [

        h('ul.nav.navbar-nav',
          h('li', h('a.navbar-brand', {href: '/'}, 'bigpiq'))),

        loaded ? 
          h('ul.nav.navbar-nav', [
            h('li',
              h('button.btn.btn-primary.navbar-btn#upload-btn', [
                h('i.fa.fa-cloud-upload'), i18('nav.add')])),
            // h('li',
            //   h('button.btn.btn-primary.navbar-btn#reset-btn', [
            //     h('i.fa.fa-refresh'), ' Start over'])),
            // h('li',
            //   h('button.btn.btn-primary.navbar-btn#undo-btn', [
            //     h('i.fa.fa-undo'), ' Undo'])),
            // h('li',
            //   h('button.btn.btn-primary.navbar-btn#redo-btn', [
            //     h('i.fa.fa-undo'), ' Redo'])),
          ]) : '',

        collection.hash === helpers.demoID ? h('.ul.nav.navbar-nav', [
          h('li',
            h('a.btn.navbar-btn.btn-info', {href: '/ui'}, [
              h('i.fa.fa-flask'), ' '+i18('nav.try')
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
                h('i.fa.fa-heart-o'), i18('nav.save')])),
              h('li', h('button.btn.btn-primary.navbar-btn#order-btn', [
                h('i.fa.fa-shopping-cart'), i18('nav.order')])),
          ]) : ''
      ]),

      h('input#file-input', {'type': "file", 'name': "image", 'multiple': true}),
    ]);
}


export function renderStartPage(collection) {
  return h('.container.start-buttons', [
      h('.row' + (!_.isUndefined(collection.id) ? '.step-disabled' : ''), [
        // h('.col-lg-12.text-center.step1', i18('front.step1')),
        h('.col-lg-12.text-center',
          h('button.btn.btn-info.btn-lg.btn-step#create-btn',
            {
              disabled: !_.isUndefined(collection.id)
            }, 
            [h('i.fa.fa-camera.fa-3x'), i18('front.upload')]
        ))
      ]),
      // h('#step2.row' + (_.isUndefined(collection.id) ? '.step-disabled' : ''), [
      //   h('.col-lg-12.step2', i18('front.step2')),
      //   h('.col-lg-7.col-lg-offset-2', 
      //     h('.form-group', 
      //       h('input.form-control.input-lg.shadow.step2-title#album-title-front', {
      //         disabled: _.isUndefined(collection.id),
      //         type: 'text',
      //         placeholder: i18('front.title'),
      //         maxLength: 50,
      //         autocomplete: 'off'
      //       })
      //     ),
      //   ),
      //   h('.col-lg-1',
      //     h('button.btn.btn-info.btn-block.btn-lg.shadow#title-btn',  h('i.fa.fa-arrow-right.fa-2x'))),
      // ])
  ]);
}



function renderProgressbar(upload) {
  if (upload.get('size', 0) > 0) {
    let progress = (upload.get('files') && upload.get('size')) ? 100 * upload.get('files').size / upload.get('size') : 0;
    return [
      h('li', 
        h('span.navbar-text', progress < 100 ? i18('ui.uploading') : i18('ui.processing'))),
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
