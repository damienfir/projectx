import Rx from 'rx';
import {run} from '@cycle/core';
import {makeDOMDriver, h} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';

import Elements from './ui'

import helpers from './helpers'
import User from './user'
import Collection from './collection'
import Upload from './upload'
import Photos from './photos'
import Album from './album'
import UserInterface from './userinterface'
import Order from './order'

let Observable = Rx.Observable;


function intent(DOM, HTTP) {
  let cancelDefault = (ev) => { ev.preventDefault(); ev.stopPropagation(); return ev; }
  let btn = (selector) => DOM.select(selector).events('click').map(cancelDefault)

  btn('#upload-area').subscribe(_ => 
      document.getElementById('file-input').dispatchEvent(new MouseEvent('click')));


  let DOMactions = {
    toggleUpload$: btn('#upload-btn').merge(btn('#create-btn')),
    selectFiles$: DOM.select('#file-input').events('change').map(ev => helpers.toArray(ev.target.files)),
    reset$: btn('#reset-btn'),
    download$: btn('#download-btn'),
    demo$: btn('#demo-btn'),
    ready$: Observable.just({}),
    shuffle$: btn('.shuffle-btn').map(ev => ev.target['data-page']),
    // increment$: btn('.incr-btn').map(ev => ev.target['data-page']),
    // decrement$: btn('.decr-btn').map(ev => ev.target['data-page']),
    albumTitle$: DOM.select('#album-title').events("input").map(ev => ev.target.value),
    // save$: btn('#save-btn'),
    hasID$: Observable.just(window.location.pathname.split('/'))
      .filter(url => url.length > 2).map(url => url.pop()),
    addPhotoCover$: btn('.cover-btn').map(ev => ev.target['data-id']),
    clickTitle$: DOM.select(".cover-title").events('click')
  }

  let HTTPactions = { 
    saved$: helpers.jsonPOSTResponse(HTTP, /\/save/).do(x => console.log(x))
  }

  return {DOMactions, HTTPactions};
}



function model(DOMactions) {
  DOMactions.toggleUpload$.subscribe(ev => $('#upload-modal').modal('show'));
  DOMactions.selectFiles$.subscribe(x => $('#upload-modal').modal('hide'));
  DOMactions.clickTitle$.subscribe(ev => document.getElementById("album-title").focus())
}


function requests(album, collection) {
  let save$ = album.state$.filter(a => a.length > 1)
    .merge(collection.state$.filter(c => c.id && c.name))
    .skip(1)
    .debounce(2000);

  return {
    saveAlbum$: save$.withLatestFrom(collection.state$, album.state$, (ev, collectionState, albumState) => ({
      url: '/save',
      method: 'POST',
      eager: true,
      send: {collection: collectionState, album: albumState}
    }))
  }
}


function view(HTTPactions, collection, album, upload, ui, order) {
  let toolbarDOM = Observable.combineLatest(
      collection.state$,
      album.state$,
      upload.state$,
      ui.state$,
      Elements.renderToolbar);
  let uploadDOM = Observable.just(Elements.renderUploadArea());
  let buttonDOM = Observable.just(Elements.renderButton());
  let alertDOM = Elements.saveNotification(HTTPactions.saved$);

  return Observable.combineLatest(toolbarDOM, uploadDOM, album.DOM, order.DOM, buttonDOM, alertDOM,
      (toolbarVTree, uploadVTree, albumVTree, orderVTree, buttonVTree, alertVTree) =>
      h('div.theme-blue', [
        toolbarVTree,
        uploadVTree,
        orderVTree,
        albumVTree || buttonVTree,
        alertVTree
      ])
  );
}


function main({DOM, HTTP}) {
  let {DOMactions, HTTPactions} = intent(DOM, HTTP);

  let user = User(HTTP, DOMactions);
  let collection = Collection(HTTP, DOMactions, user.state$);
  let upload = Upload(DOMactions, collection);
  let photos = Photos(DOMactions, upload, collection);
  let album = Album(DOM, HTTP, DOMactions, collection, photos, upload);
  let ui = UserInterface(DOMactions, album);
  let order = Order(DOM, HTTP, user, collection);

  model(DOMactions);

  let req = requests(album, collection);

  let requests$ = Observable.merge(
      _.values(user.HTTP)
      .concat(_.values(collection.HTTP))
      .concat(_.values(order.HTTP))
      .concat(_.values(album.HTTP))
      .concat(_.values(req)))
    // .do(x => console.log(x));

  return {
    DOM: view(HTTPactions, collection, album, upload, ui, order),
    HTTP: requests$
  };
}


run(main, {
  DOM: makeDOMDriver('#app'),
  HTTP: makeHTTPDriver()
});
