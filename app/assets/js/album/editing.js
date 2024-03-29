import Rx from 'rx';
import {h} from '@cycle/dom';
import helpers from '../helpers';


let eventToCoord = (ev) => ({
    'x': ev.screenX,
    'y': ev.screenY,
    'img': ev.target,
    'idx': (ev.target['data-idx'] + 1 || ev.target.parentNode['data-idx'] + 1) - 1,
    'page': (ev.target['data-page'] + 1 || ev.target.parentNode['data-page'] + 1) -1
});


function intent(DOM) {
  let tileDown$ = DOM.select('.ui-tile, .page-hover').events('mousedown').map(helpers.cancel).map(eventToCoord);
  let tileUp$ = DOM.select('.ui-tile, .page-hover').events('mouseup').map(eventToCoord);
  let mouseUp$ = DOM.select(':root').events('mouseup');
  let mouseMove$ = DOM.select(':root').events('mousemove').map(helpers.cancel);
  let mouseMoveCoord$ = mouseMove$.map(eventToCoord);
  // let edgeDown$ = DOM.select('.move-mosaic').events('mousedown')
  //   .filter(ev => _.contains(ev.target.classList, 'move-mosaic'));
  let edgeDown$ = DOM.select('.node').events('mousedown').map(helpers.cancel);

  let cancelExt$ = new Rx.Subject();

  let remove$ = helpers.btn(DOM, '#remove-btn');
  let cancelBtn$ = helpers.btn(DOM, '#cancel-btn');
  let rotate$ = helpers.btn(DOM, '#rotate-btn');
  let cover$ = helpers.btn(DOM, '#add-cover-btn');

  let clickEdge$ = edgeDown$.map(ev => ({
    x: ev.target.offsetLeft/ev.target.parentNode.offsetWidth,
    y: ev.target.offsetTop/ev.target.parentNode.offsetHeight,
    w: ev.target.parentNode.offsetWidth,
    h: ev.target.parentNode.offsetHeight,
    page: ev.target.parentNode['data-page'],
  }));

  let dragEdge$ = clickEdge$.flatMapLatest(down =>
    mouseMove$.takeUntil(mouseUp$)
    .pairwise()
    .map(([prev,move]) => ({
      dx: (move.screenX - prev.screenX) / down.w,
      dy: (move.screenY - prev.screenY) / down.h,
      down
    })));

  let cancel$ = tileDown$
    .flatMapLatest(down => mouseMove$
        .takeUntil(mouseUp$)
        .take(1))
    .merge(cancelBtn$)
    .map(false)
    .share();

  let selected$ = tileDown$
    .flatMapLatest(down => mouseMove$
        .takeUntil(mouseUp$)
        .count()
        .filter(c => c === 0)
        .map(down))
    .merge(cancel$)
    .scan((prev, x) => prev ? false : x, false)
    .filter(_.identity)
    .share();
  
  let [swap$, move$] = selected$.flatMapLatest(from =>
      tileUp$.take(1)
        .takeUntil(cancel$)
        .map(to => ({from,to})))
    .partition(({from,to}) => from.page === to.page);

  let drag$ = tileDown$.flatMapLatest(down => mouseMoveCoord$
      .takeUntil(mouseUp$)
      .pairwise()
      .map(([prev, curr]) => ({
        dx: (curr.x-prev.x) / down.img.width,
        dy: (curr.y-prev.y) / down.img.height,
        page: down.page,
        idx: down.idx,
      })));

  return {swap$, move$, drag$, selected$, cancel$, clickEdge$, dragEdge$, remove$, rotate$, cover$, cancelExt$};
}


function model(actions, DOMactions) {

  actions.clickEdge$.subscribe(ev => $('.node').tooltip('destroy'));
  actions.selected$.subscribe(ev => $('.ui-tile').tooltip('destroy'));

  return Rx.Observable.merge(
      actions.selected$.map(down => state => _.extend(state, {selected: down})),
      actions.selected$.take(1).map(ev => state => _.extend(state, {selectedTile: true})),
      actions.clickEdge$.take(1).map(ev => state => _.extend(state, {draggedNode: true})),
      Rx.Observable.merge(
        actions.swap$,
        actions.move$,
        actions.cancel$,
        actions.cancelExt$
      ).map(x => state => _.extend(state, {selected: undefined})),
      DOMactions.reset$.map(ev => state => ({}))
    )
    .startWith({})
    .scan(helpers.apply);
}


// function view(state$) {
//   return state$.map(state =>
//     state.selected ?
//           h('.btn-group.toolbar', [
//             h('button.btn.btn-info.btn-lg#remove-btn', [
//               h('i.fa.fa-trash-o')]),
//             // h('li', h('button.btn.btn-warning.navbar-btn#rotate-btn', [h('i.fa.fa-rotate-right')])),
//             state.selected.page !== 0 ? h('button.btn.btn-info.btn-lg#add-cover-btn', [h('i.fa.fa-book')]) : '',
//             h('button.btn.btn-info.btn-lg#cancel-btn', [h('i.fa.fa-times')])
//         ]) : ''
//   );
// }


module.exports = function(DOM, DOMactions) {

  let actions = intent(DOM);
  let state$ = model(actions, DOMactions);

  return {
    // DOM: view(state$),
    state$,
    actions
  };
};
