import {Rx,run} from '@cycle/core';
import {makeDOMDriver, h} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import _ from 'underscore';

import Elements from './ui'
import demo from "./demo"

import {toArray} from './helpers'
import User from './user'
import Collection from './collection'
import Upload from './upload'
import Photos from './photos'
import Album from './album'
import UserInterface from './userinterface'

let Observable = Rx.Observable;


function intent(DOM) {
  let cancelDefault = (ev) => { ev.preventDefault(); ev.stopPropagation(); return ev; }
  let btn = (selector) => DOM.select(selector).events('click').map(cancelDefault)

    btn('#upload-area').subscribe(_ => 
        document.getElementById('file-input').dispatchEvent(new MouseEvent('click')));

  return {
    toggleUpload$: btn('#upload-btn').merge(btn('#create-btn')),
    selectFiles$: DOM.select('#file-input').events('change').map(ev => toArray(ev.target.files)),
    reset$: btn('#reset-btn'),
    download$: btn('#download-btn'),
    demo$: btn('#demo-btn'),
    ready$: Observable.just({}),
    shuffle$: btn('.shuffle-btn').map(ev => ev.target['data-page']),
    increment$: btn('.incr-btn').map(ev => ev.target['data-page']),
    decrement$: btn('.decr-btn').map(ev => ev.target['data-page'])
  }
}


function view(collection, album, upload, ui) {
  return Observable.combineLatest(collection.state$, album.state$, upload.state$, ui.state$, album.DOM,
      (collectionState, albumState, uploadState, uiState, albumVTree) =>
      h('div', [
        Elements.renderToolbar(collectionState, albumState),
        Elements.renderUploadArea(uiState.state, uploadState),
        albumVTree
      ])
      );
}


function main({DOM, HTTP}) {
  let actions = intent(DOM);

  let user = User(HTTP, actions);
  let collection = Collection(HTTP, actions, user.state$);
  let upload = Upload(actions, collection);
  let photos = Photos(actions, upload);
  let album = Album(DOM, HTTP, actions, collection, photos, upload);
  let ui = UserInterface(actions, album);

  let requests$ = Observable.merge(
      _.values(user.HTTP)
      .concat(_.values(collection.HTTP))
      .concat(_.values(album.HTTP)));

  return {
    DOM: view(collection, album, upload, ui),
    HTTP: requests$
  };
}


run(main, {
  DOM: makeDOMDriver('#app'),
  HTTP: makeHTTPDriver()
});
