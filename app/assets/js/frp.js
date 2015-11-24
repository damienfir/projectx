import Rx from 'rx';
import {run} from '@cycle/core';
import {makeDOMDriver, h} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';

import * as Elements from './ui'

import helpers from './helpers'
import User from './user'
import Collection from './collection'
import Upload from './upload'
import Photos from './photos'
import Album from './album'
import Composition from './composition-ui'
import Editing from './editing'
import UserInterface from './userinterface'
import Order from './order'
import Save from './save'
import Analytics from './analytics'

let Observable = Rx.Observable;


function intent(DOM, HTTP) {
  let cancelDefault = (ev) => { ev.preventDefault(); ev.stopPropagation(); return ev; }
  let btn = (selector) => DOM.select(selector).events('click').map(cancelDefault)

  let drop$ = DOM.select("#upload-area").events('drop')
    .map(helpers.cancel)
    .map(ev => helpers.toArray(ev.dataTransfer.files))
  let filedialog$ = DOM.select('#file-input').events('change').map(ev => helpers.toArray(ev.target.files));
  let selectFiles$ = filedialog$.merge(drop$);

  let actions = {
    drop$,
    filedialog$,
    selectFiles$,
    reset$: btn('#reset-btn'),
    download$: btn('#download-btn'),
    demo$: btn('#demo-btn'),
    undo$: btn('#undo-btn'),
    redo$: btn('#redo-btn'),
    ready$: Observable.just({}),
    hasHash$: Observable.just(window.location.pathname.split('/'))
      .filter(url => url.length > 2).map(url => url.pop()).shareReplay(1),
  }

  return actions;
}


function view(collection, album, upload, order, save, editing) {
  let toolbarDOM = Observable.combineLatest(
      collection.state$,
      album.state$,
      upload.state$,
      Elements.renderToolbar);
  let buttonDOM = collection.state$.map(Elements.renderStartPage);

  return Observable.combineLatest(toolbarDOM, upload.DOM, album.DOM, order.DOM, buttonDOM, save.DOM, editing.DOM,
      (toolbarVTree, uploadVTree, albumVTree, orderVTree, buttonVTree, saveVTree, editingVTree) =>
      h('div.theme-blue', [
        toolbarVTree,
        uploadVTree,
        orderVTree,
        albumVTree || buttonVTree,
        saveVTree,
        editingVTree
      ])
  );
}


function main({DOM, HTTP}) {
  let DOMactions = intent(DOM, HTTP);

  let user = User(HTTP, DOMactions);
  let collection = Collection(DOM, HTTP, DOMactions, user);
  let upload = Upload(DOM, DOMactions, collection);
  let photos = Photos(DOMactions, upload, collection);
  let editing = Editing(DOM);
  let album = Album(DOM, HTTP, DOMactions, collection, photos, upload, editing);
  let order = Order(DOM, HTTP, user, collection);
  let save = Save(DOM, HTTP, user, collection, album);

  let requests$ = Observable.merge(
      _.values(user.HTTP)
      .concat(_.values(collection.HTTP))
      .concat(_.values(order.HTTP))
      .concat(_.values(album.HTTP))
      .concat(_.values(save.HTTP)));//.do(x => console.log(x));

  Analytics(DOMactions, user, collection, upload, album, order);

  return {
    DOM: view(collection, album, upload, order, save, editing),
    HTTP: requests$
  };
}


run(main, {
  DOM: makeDOMDriver('#app'),
  HTTP: makeHTTPDriver()
});
