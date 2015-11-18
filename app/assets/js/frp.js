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
import Composition from './composition-ui'
import UserInterface from './userinterface'
import Order from './order'
import Analytics from './analytics'

let Observable = Rx.Observable;


function intent(DOM, HTTP) {
  let cancelDefault = (ev) => { ev.preventDefault(); ev.stopPropagation(); return ev; }
  let btn = (selector) => DOM.select(selector).events('click').map(cancelDefault)

  btn('#upload-area').subscribe(_ => 
      document.getElementById('file-input').dispatchEvent(new MouseEvent('click')));

  DOM.select('#upload-area').events('dragover')
    .map(helpers.cancel)
    .subscribe(ev => {ev.dataTransfer.dropEffect = 'copy'; return ev;});

  let drop$ = DOM.select("#upload-area").events('drop')
    .map(helpers.cancel)
    .map(ev => ev.dataTransfer.files)
    .map(helpers.toArray);
  
  let filedialog$ = DOM.select('#file-input').events('change').map(ev => helpers.toArray(ev.target.files));

  let DOMactions = {
    drop$,
    filedialog$,
    toggleUpload$: btn('#upload-btn').merge(btn('#create-btn')),
    selectFiles$: filedialog$.merge(drop$),
    reset$: btn('#reset-btn'),
    download$: btn('#download-btn'),
    demo$: btn('#demo-btn'),
    ready$: Observable.just({}),
    albumTitle$: DOM.select('#album-title').events("input").map(ev => ev.target.value),
    hasID$: Observable.just(window.location.pathname.split('/'))
      .filter(url => url.length > 2).map(url => url.pop()).shareReplay(1),
    clickTitle$: DOM.select(".cover-title").events('click')
  }

  let HTTPactions = { 
    saved$: helpers.jsonPOSTResponse(HTTP, /\/save/)
  }

  return {DOMactions, HTTPactions};
}



function model(DOMactions) {
  DOMactions.toggleUpload$.subscribe(ev => $('#upload-modal').modal('show'));
  DOMactions.selectFiles$.subscribe(x => $('#upload-modal').modal('hide'));
  DOMactions.clickTitle$.subscribe(ev => document.getElementById("album-title").focus())
}


function requests(album, collection) {
  let save$ = album.state$.merge(collection.state$) 
    .skip(1)
    .debounce(2000);

  let demoID = parseInt(document.getElementById("demo-id").value);

  return {
    saveAlbum$: save$.withLatestFrom(collection.state$, album.state$, (ev, album, collection) => ({
      url: '/save',
      method: 'POST',
      eager: true,
      send: {collection: collection, album: album}
    })).filter(req => req.send.collection.id && req.send.collection.id !== demoID && req.send.album.length)
  }
}


function view(HTTPactions, collection, album, upload, order) {
  let toolbarDOM = Observable.combineLatest(
      collection.state$,
      album.state$,
      upload.state$,
      Elements.renderToolbar);
  let buttonDOM = Observable.just(Elements.renderButton());
  let alertDOM = Elements.saveNotification(HTTPactions.saved$);

  return Observable.combineLatest(toolbarDOM, upload.DOM, album.DOM, order.DOM, buttonDOM, alertDOM,
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
  let upload = Upload(DOM, DOMactions, collection);
  let photos = Photos(DOMactions, upload, collection);
  let composition = Composition(DOM);
  let album = Album(DOM, HTTP, DOMactions, collection, photos, upload, composition);
  let order = Order(DOM, HTTP, user, collection);

  model(DOMactions);

  let req = requests(album, collection);

  let requests$ = Observable.merge(
      _.values(user.HTTP)
      .concat(_.values(collection.HTTP))
      .concat(_.values(order.HTTP))
      .concat(_.values(album.HTTP))
      .concat(_.values(req))).do(x => console.log(x));

  Analytics(DOMactions, user, collection, upload, album, composition, order, req);

  return {
    DOM: view(HTTPactions, collection, album, upload, order),
    HTTP: requests$
  };
}


run(main, {
  DOM: makeDOMDriver('#app'),
  HTTP: makeHTTPDriver()
});
