import Rx from 'rx';
import {h} from '@cycle/dom';
import helpers from './helpers'

let pageAndIndex = (ev) => ({page: ev.target.parentNode['data-page'], index: ev.target.parentNode['data-idx']})

let eventToCoord = (ev) => ({
    'x': ev.screenX,
    'y': ev.screenY,
    'img': ev.target,
    'idx': (ev.target['data-idx'] + 1 || ev.target.parentNode['data-idx'] + 1) - 1,
    'page': (ev.target['data-page'] + 1 || ev.target.parentNode['data-page'] + 1) -1
})


function intent(DOM) {
  let tileDown$ = DOM.select('.ui-tile, .page-hover').events('mousedown').map(helpers.cancel).map(eventToCoord);
  let tileUp$ = DOM.select('.ui-tile, .page-hover').events('mouseup').map(eventToCoord);
  let mouseUp$ = DOM.select(':root').events('mouseup');
  let mouseMove$ = DOM.select(':root').events('mousemove').map(helpers.cancel);
  let mouseMoveCoord$ = mouseMove$.map(eventToCoord);
  let edgeDown$ = DOM.select('.move-mosaic').events('mousedown')
    .filter(ev => _.contains(ev.target.classList, 'move-mosaic'));

  let remove$ = helpers.btn(DOM, '#remove-btn');
  let cancelBtn$ = helpers.btn(DOM, '#cancel-btn');
  let rotate$ = helpers.btn(DOM, '#rotate-btn');
  let cover$ = helpers.btn(DOM, '#add-cover-btn');

  let clickEdge$ = edgeDown$.map(ev => _.extend(ev.target, {
    x: ev.offsetX/ev.target.offsetWidth,
    y: ev.offsetY/ev.target.offsetHeight,
    page: ev.target['data-page']
  }));

  let dragEdge$ = clickEdge$.flatMapLatest(down =>
    mouseMove$.takeUntil(mouseUp$)
    .pairwise()
    .map(([prev,move]) => ({
      dx: (move.screenX - prev.screenX) / down.offsetWidth,
      dy: (move.screenY - prev.screenY) / down.offsetHeight,
      down
    })));

  let cancel$ = tileDown$
    .flatMapLatest(down => mouseMove$
        .takeUntil(mouseUp$)
        .take(1))
    .merge(remove$)
    .merge(cancelBtn$)
    .merge(cover$)
    .map(false);

  let selected$ = tileDown$
    .flatMapLatest(down => mouseMove$
        .takeUntil(mouseUp$)
        .count()
        .filter(c => c === 0)
        .map(down))
    .merge(cancel$)
    .scan((prev, x) => prev ? false : x, false)
    .filter(_.identity);
  
  let mouseOver$ = selected$.flatMapLatest(from => tileUp$.take(1).takeUntil(cancel$).map(to => ({from,to})));
  let swap$ = mouseOver$.filter(({from,to}) => from.page === to.page);
  let move$ = mouseOver$.filter(({from,to}) => from.page !== to.page);

  let drag$ = tileDown$.flatMapLatest(down => mouseMoveCoord$
      .takeUntil(mouseUp$)
      .pairwise()
      .map(([prev, curr]) => ({
        dx: (curr.x-prev.x) / down.img.width,
        dy: (curr.y-prev.y) / down.img.height,
        page: down.page,
        idx: down.idx,
      })));

  return {swap$, move$, drag$, selected$, cancel$, clickEdge$, dragEdge$, remove$, rotate$, cover$};
}

function model(actions) {
  return Rx.Observable.merge(
      actions.selected$.map(down => state => _.extend(state, {selected: down})),
      Rx.Observable.merge(
        actions.swap$,
        actions.move$,
        actions.cancel$).map(x => state => ({}))
    )
    .startWith({})
    .scan(helpers.apply);
}


function view(state$) {
  return state$.map(state =>
    state.selected ?
          h('.btn-group.toolbar', [
            h('button.btn.btn-info.btn-lg#remove-btn', [
              h('i.fa.fa-trash-o')]),
            // h('li', h('button.btn.btn-warning.navbar-btn#rotate-btn', [h('i.fa.fa-rotate-right')])),
            state.selected.page !== 0 ? h('button.btn.btn-info.btn-lg#add-cover-btn', [h('i.fa.fa-book')]) : '',
            h('button.btn.btn-info.btn-lg#cancel-btn', [h('i.fa.fa-times')])
        ]) : ''
  )
}


module.exports = function(DOM) {

  let actions = intent(DOM);
  let state$ = model(actions);

  return {
    DOM: view(state$),
    state$,
    actions
  }
}
