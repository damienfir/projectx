import {Rx,run} from '@cycle/core';
import {makeDOMDriver, h} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import $ from "jquery"
import _ from 'underscore';
import Immutable from 'immutable';

import Composition from './composition-ui'
import UI from './ui'
import demo from "./demo"
import cookie from './cookies'

let Observable = Rx.Observable;

let COOKIE = 'bigpiquser'

var initial = {
  user: {},
  collection: Immutable.fromJS({'photos': []}),
  album: []
};


function toArray(filelist) {
  var list = [];
  for (var i = 0; i < filelist.length; i++) list.push(filelist[i]);
  return list;
}


let isNotEmpty = obj => !_.isEmpty(obj)
let asc = (a,b) => a - b
let apply = (state, func) => func(state)
let log = x => console.log(x)
let argArray = (a,b) => [a,b]

let jsonGET = (HTTP, regex) =>
  HTTP.filter(res$ => res$.request.method === undefined)
    .filter(res$ => res$.request.match(regex))
    .mergeAll().map(res => res.body).share();

let jsonPOST = (HTTP, regex) =>
  HTTP.filter(res$ => res$.request.method === 'POST')
    .filter(res$ => res$.request.url.match(regex))
    .mergeAll().map(res => res.body).share();


function User(HTTP, DOMactions) {

  function intent(HTTP) {
    return {
      gotUser$: jsonGET(HTTP, /^\/users\/\d+$/),
      createdUser$: jsonPOST(HTTP, /^\/users$/),
    }
  }

  function model(HTTPactions) {
    let userIDCookie$ = Observable.return(cookie.getItem(COOKIE)).map(id => ({id})).shareReplay(1);

    let userState$ = Observable.merge(
        HTTPactions.gotUser$,
        HTTPactions.createdUser$)
      .filter(isNotEmpty)
      .map(newuser => user => newuser)
      .startWith({})
      .scan(apply)
      .shareReplay(1);

    userState$.subscribe(user => cookie.setItem(COOKIE, user.id));

    return userState$;
  }

  function requests(DOMactions, userState$) {
    return {
      getUser$: userState$.filter(x => x.id)
        .zip(DOMactions.selectFiles$.first())
        .map(([id,files]) => '/users/'+id),

      createUser$: userState$.filter(x => !x.id)
        .zip(DOMactions.selectFiles$.first())
        .map(x => ({
          method: 'POST',
          url: '/users',
          send: {}
        }))
    };
  }

  let state$ = model(intent(HTTP))
  let requests$ = requests(DOMactions, state$);

  return {
    HTTP: requests$,
    state$
  }
}


function Upload(DOMactions, collection) {

  function makeUploadRequest(file, collection) {
    var fd = new FormData();
    fd.append("image", file);
    return Observable.fromPromise($.ajax({
      url: "/collections/"+collection.id+"/photos",
      method: 'POST',
      data: fd,
      processData: false,
      contentType: false
    }));
  }

  const startUpload$ = Observable.merge(
      DOMactions.selectFiles$.flatMapLatest(files => collection.actions.createdCollection$.map(c => [files,c])),
      DOMactions.selectFiles$.withLatestFrom(collection.state$, argArray).filter(([f,c]) => !_.isUndefined(c.id)))
    .share();

  const fileUpload$ = startUpload$.flatMap(([files, collection]) =>
      Observable.from(files).flatMap(file => makeUploadRequest(file, collection)).scan((acc,el) => acc.concat(el)))
    .share();

  const uploadedFiles$ = fileUpload$.withLatestFrom(startUpload$,
      (uploaded, [files, collection]) => ({uploaded, files}))
    .filter(({uploaded, files}) => uploaded.length === files.length)
    .map(({uploaded, files}) => uploaded);

  const state$ = Observable.merge(
      startUpload$.map(([files,collection]) => upload => _.extend(upload, {files: [], size: files.length})),
      fileUpload$.map(files => upload => _.extend(upload, {files: files})),
      uploadedFiles$.map(files => upload => ({})))
    .startWith({})
    .scan(apply)
    .share();

  return {
    actions: {startUpload$, fileUpload$, uploadedFiles$},
    state$
  };
}


function Photos(DOMactions, upload) {
    let demoPhotos$ = DOMactions.demo$.map(x => y => demo.collection.photos);
    let newPhotos$ = upload.actions.uploadedFiles$.map(upload => photos => photos.concat(upload.files));
    let clearPhotos$ = DOMactions.reset$.map(x => y => []);

    let state$ = Observable.merge(newPhotos$, clearPhotos$, demoPhotos$)
      .startWith([])
      .scan(apply)
      .shareReplay(1);

    return {
      state$
    };
}


function Collection(HTTP, DOMactions, userState$) {

  function intent(HTTP) {
    return {
      createdCollection$: jsonPOST(HTTP, /\/users\/\d+\/collections/)
    }
  }

  function model(HTTPactions, DOMactions) {
    let demoCollection$ = DOMactions.demo$.map(x => col => Immutable.fromJS(demo.collection));
    let collectionUpdated$ = HTTPactions.createdCollection$.map(col => collection => Immutable.fromJS(col));
    let clearCollection$ = DOMactions.reset$.map(x => item => initial.collection);

    let collectionState$ = Observable.merge(
        collectionUpdated$,
        clearCollection$,
        demoCollection$)
      .startWith(initial.collection)
      .scan(apply)
      .shareReplay(1);

    return collectionState$;
  }

  function requests(DOMactions, userState$, state$) {
    return {
      createCollection$: Observable.merge(
          DOMactions.selectFiles$.flatMapLatest(files => userState$.map(user => [files,user])),
          DOMactions.selectFiles$.withLatestFrom(userState$, argArray).filter(([f,u]) => !_.isEmpty(u)))
        .withLatestFrom(state$, argArray).filter(([x,col]) => _.isUndefined(col.id)).map(([x,col]) => x)
        .map(([f,user]) => ({
          url:'/users/'+user.id+'/collections',
          method: 'POST',
          send: {}
        }))
    }
  }

  let actions = intent(HTTP);
  let state$ = model(actions, DOMactions);
  let requests$ = requests(DOMactions, userState$, state$);

  return {
    HTTP: requests$,
    state$,
    actions
  }
}


function Album(DOM, HTTP, DOMactions, collection, photos, upload) {
  function intent(HTTP) {
    return {
      createdAlbum$: jsonPOST(HTTP, /\/collections\/\d+\/pages\?startindex=.*/),
      downloadedAlbum$: jsonPOST(HTTP, /\/collections\/\d+\/download/),
      shuffledPage$: jsonPOST(HTTP, /\/collections\/\d+\/page\?index=.*/)
    }
  }

  function model(DOMactions, HTTPactions, composition$) {
    HTTPactions.downloadedAlbum$.subscribe(url => {
      window.open("/storage/generated/" + url);
    });

    const demoAlbum$ = DOMactions.demo$.map(x => album => demo.album);
    const albumUpdated$ = HTTPactions.createdAlbum$
      .map(newpages => album => album.concat(newpages).sort((a,b) => asc(a.index,b.index)));
    const clearAlbum$ = DOMactions.reset$.map(x => item => initial.album);
    const albumPageShuffled$ = HTTPactions.shuffledPage$.map(page => album => { album[page.index] = page; return album; });

    const albumState$ = Observable.merge(albumUpdated$, clearAlbum$, demoAlbum$, albumPageShuffled$, composition$)
      .startWith(initial.album)
      .scan(apply)
      .shareReplay(1);

    return albumState$;
  }

  function requests(DOMactions, album, collection, photos, upload) {
    return {
      createAlbum$: upload.actions.uploadedFiles$.withLatestFrom(collection.state$, album.state$,
          (photos, collection, album) => ({
            url: '/collections/'+collection.id+'/pages?startindex='+album.length,
            method: 'POST',
            send: photos
          })),

      downloadAlbum$: DOMactions.download$.withLatestFrom(collection.state$, album.state$,
          (x, collection, album) => ({
            url: '/collections/' + collection.id + '/download',
            method: 'POST',
            send: album
          })),

      shufflePage$: DOMactions.shuffle$.withLatestFrom(collection.state$, photos.state$, album.state$,
          (page, collection, photos, album) => ({
            url: '/collections/'+collection.id+'/page?index='+page,
            method: 'POST',
            send: _.filter(photos, p => _.where(album[page].tiles, {'photoID': p.id}).length > 0)
          }))
    };
  }

  function hashMap(photos) {
    if (!photos) return {};
    if (_.isObject(photos)) return photos;
    return _.object(photos.map(p => [p.id, p.hash]));
  }

  function view(albumState$, photosState$) {
    let photosDict$ = photosState$.map(hashMap);
    return albumState$.combineLatest(photosState$,
        (album, photos) =>
          (album.length && !photos.isEmpty()) ?
            h('div.container-fluid.limited-width.album', UI.renderAlbum(state)) :
            UI.renderButton()
        );
  }

  let compositionMod$ = Composition(DOM);

  let actions = intent(HTTP);
  let state$ = model(DOMactions, actions, compositionMod$);
  let requests$ = requests(DOMactions, state$, collection, photos, upload);
  let vtree$ = view(state$, photos.state$);

  return {
    DOM: vtree$,
    HTTP: requests$,
    state$,
    actions
  }
}


function ui(DOMactions, album) {

  function model(DOMactions, album) {
    let uploadBox$ = DOMactions.toggleUpload$.map(f => ui => ui ^ UI.UI.uploadBox);
    let uploading$ = DOMactions.selectFiles$.map(f => ui => (ui ^ UI.UI.uploading) & ~UI.UI.processing);
    let processing$ = album.HTTP.createAlbum$.map(f => ui => (ui ^ UI.UI.processing) & ~UI.UI.uploading);
    let complete$ = album.actions.createdAlbum$.map(f => ui => ui & ~(UI.UI.uploading | UI.UI.processing | UI.UI.uploadBox));

    return Rx.Observable.merge(uploadBox$, uploading$, processing$, complete$)
      .startWith(UI.UI.initial)
      .scan((ui,func) => func(ui));
  }

  let state$ = model(DOMactions, album);

  return {
    state$
  }
}


function main({DOM, HTTP}) {
  function intent(DOM) {
    let cancelDefault = (ev) => { ev.preventDefault(); ev.stopPropagation(); return ev; }
    let btn = (selector) => DOM.select(selector).events('click').map(cancelDefault)

      btn('#upload-area').subscribe(_ => 
          document.getElementById('file-input').dispatchEvent(new MouseEvent('click')));

    return {
      toggleUpload$: btn('#upload-btn').merge(btn('#create-btn')),
      selectFiles$: DOM.select('#file-input').events('change').map(ev => toArray(ev.target.files)).share(),
      reset$: btn('#reset-btn'),
      download$: btn('#download-btn'),
      demo$: btn('#demo-btn'),
      ready$: Observable.just({}),
      shuffle$: btn('.shuffle-btn').map(ev => ev.target['data-page']),
      increment$: btn('.incr-btn').map(ev => ev.target['data-page']),
      decrement$: btn('.decr-btn').map(ev => ev.target['data-page'])
    }
  }

  function model(states) {
    return Observable.combineLatest(states,
        (user, collection, photos, upload, album, ui) => ({user, album, collection, upload, photos, ui}))
      .do(x => console.log(x))
      .shareReplay(1);
  }

  function view(state$, album) {
    return state$.map(state => 
      h('div', [
        UI.renderToolbar(state),
        UI.renderUploadArea(state),
        album.DOM
      ])
    );
  }

  let actions = intent(DOM);

  let user = User(HTTP, actions);
  let collection = Collection(HTTP, actions, user.state$);
  let upload = Upload(actions, collection);
  let photos = Photos(actions, upload);
  let album = Album(DOM, HTTP, actions, collection, photos, upload);
  let UI = ui(actions, album);

  let state$ = model([user.state$, collection.state$, photos.state$, upload.state$, album.state$, UI.state$]);

  let requests$ = Observable.merge(
      _.values(user.HTTP)
      .concat(_.values(collection.HTTP))
      .concat(_.values(album.HTTP)));

  return {
    DOM: view(state$),
    HTTP: requests$
  };
}


run(main, {
  DOM: makeDOMDriver('#app'),
  HTTP: makeHTTPDriver()
});
