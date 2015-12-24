/* @flow */

import Rx from 'rx';
import {run} from '@cycle/core';
import {makeDOMDriver, h} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import {fromJS, List} from 'immutable';

import * as Elements from './ui';

import helpers from './helpers';
import User from './user';
import Collection from './collection';
import Upload from './upload';
import Photos from './photos';
import Album from './album/album';
import Editing from './album/editing';
import UserInterface from './userinterface';
import Order from './order';
import Save from './save';
import Analytics from './analytics';

let Observable = Rx.Observable;

function toArray(list) {
  return Array.prototype.slice.call(list || [], 0);
}

function parseEntry(f, cb) {
  if (f.isFile) {
    cb(f.getAsFile());
  } else if (f.isDirectory) {
    let entries = [];
    let readEntries = (reader) => reader.readEntries((results) => {
      if (!results.length) {
        cb(entries);
      } else {
        entries = entries.concat(toArray(results));
        readEntries(reader);
      }
    });

    readEntries(f.createReader());
  } else cb([]);
}


function intent(DOM, HTTP) {
  let cancelDefault = (ev) => { ev.preventDefault(); ev.stopPropagation(); return ev; };
  let btn = (selector) => DOM.select(selector).events('click').map(cancelDefault);

  let listDir = Rx.Observable.fromCallback(parseEntry);
  let getFile = Rx.Observable.fromCallback((entry, cb) => entry.file(cb));

  let drop$ = DOM.select("#upload-area").events('drop')
    .map(helpers.cancel)
    .flatMap(ev => Rx.Observable.from(helpers.toArray(ev.dataTransfer.items)))
    .flatMap(dir => listDir(dir.webkitGetAsEntry ? dir.webkitGetAsEntry() : dir))
    .map(x => _.flatten(x.filter(f => f !== null)))
    .flatMap(entries => Rx.Observable.from(entries).flatMap(entry => getFile(entry)).reduce((arr,x) => arr.concat(x), []))
    .do(x => console.log(x))
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
  };

  return actions;
}


function view(collection, album, upload, order, save, editing) {
  let toolbarDOM = Observable.combineLatest(
      collection.state$,
      album.state$,
      upload.state$,
      Elements.renderToolbar);
  let buttonDOM = collection.state$.map(Elements.renderStartPage);

  // $('body').tooltip({selector: '[data-toggle="tooltip"]'});

  $(window).on('scroll', () =>
    !$(document).scrollTop() ?
      $('#nav').removeClass('shadow-lg') :
      $('#nav').addClass('shadow-lg')); 

	$('a[href*="#"]:not([href="#"])').click(function() {
		if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
			var target = $(this.hash);
		target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
		if (target.length) {
			$('html,body').animate({
				scrollTop: target.offset().top
			}, 1000);
			return false;
		}
	}
	});

  return Observable.combineLatest(toolbarDOM, upload.DOM, album.DOM, order.DOM, buttonDOM, save.DOM,
      (toolbarVTree, uploadVTree, albumVTree, orderVTree, buttonVTree, saveVTree) =>
      h('div.theme-blue', [
        toolbarVTree,
        uploadVTree,
        orderVTree,
        albumVTree,
        saveVTree
      ])
  );
}


function main({DOM, HTTP}) {
  let DOMactions = intent(DOM, HTTP);

  let user = User(HTTP, DOMactions);
  let collection = Collection(DOM, HTTP, DOMactions, user);
  let upload = Upload(DOM, DOMactions, collection);
  let photos = Photos(DOMactions, upload, collection);
  let editing = Editing(DOM, DOMactions);
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
