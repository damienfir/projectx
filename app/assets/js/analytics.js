import Rx from 'rx';

let gaEvent = (category, action, label, value) => ga('send', 'event', category, action, label, value);


module.exports = function(DOMactions, user, collection, upload, album, composition, order, req) {
  let events = [
// global actions
    DOMactions.reset$.map({c: 'album', a: 'reset'}),

    DOMactions.demo$.map({c: 'album', a: 'demo'}),

    DOMactions.hasID$.map(
      id => ({c: 'album', a: 'load', l: id})),


// file upload
    DOMactions.filedialog$.withLatestFrom(collection.state$,
        (files, collection) => ({c: 'files', a: 'upload', l: 'dialog', v: files.length})),

    DOMactions.drop$.withLatestFrom(collection.state$,
      (ev, collection) => ({c: 'files', a: 'upload', l: 'drop', v: files.length})),


// album modifications
    DOMactions.albumTitle$.debounce(2000).map(
      title => ({c: 'title', a: 'change', l: title})),

    // album.state$.filter(a => a.length > 1).map({c: 'album', a: 'alter'}),

    album.actions.shuffle$.debounce(2000).map(page => ({c: 'album', a: 'shuffle', l: page})),

    album.actions.incrPhotos$.debounce(1000).map(page => ({c: 'album', a: 'increment', l: page})),
    album.actions.decrPhotos$.debounce(1000).map(page => ({c: 'album', a: 'decrement', l: page})),
    album.actions.addPhotoCover$.debounce(1000).map(id => ({c: 'album', a: 'add-to-cover', l: id})),

    composition.actions.crop.drag$.debounce(1000).map(
      drag => ({c: 'album', a: 'crop', l: drag.page, v: drag.idx})),

    composition.actions.crop.swap$.debounce(1000).map(
      swap => ({c: 'album', a: 'swap', l: swap.from.page + ' -> ' + swap.to.page, v: swap.from.idx + ' -> ' + swap.to.idx})),

    composition.actions.edge.drag$.debounce(1000).map(
        drag => ({c: 'album', a: 'edge', l: drag.down.page})),
  ];

  Rx.Observable.merge(events).do(x => console.log(x)).subscribe(({c,a,l,v}) => gaEvent(c,a,l,v));
}
