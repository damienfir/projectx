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
  let tileDown$ = DOM.select('.ui-tile, .page-hover').events('mousedown').map(eventToCoord);
  let tileUp$ = DOM.select('.ui-tile, .page-hover').events('mouseup').map(eventToCoord);
  let mouseUp$ = DOM.select(':root').events('mouseup');
  let mouseMove$ = DOM.select(':root').events('mousemove').map(helpers.cancel);
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

  let drag$ = tileDown$.flatMapLatest(down => mouseMove$
      .takeUntil(mouseUp$)
      .pairwise()
      .map(([prev, curr]) => _.extend(curr, {
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
      h('.navbar.navbar-default.navbar-fixed-top.toolbar',
        h('.container-fluid', [
          h('ul.nav.navbar-nav.navbar-left', [
            h('li', h('button.btn.btn-warning.navbar-btn#remove-btn', [h('i.fa.fa-trash-o'),
                state.selected.page === 0 ? " Remove from cover page" : " Remove from album"])),
            // h('li', h('button.btn.btn-warning.navbar-btn#rotate-btn', [h('i.fa.fa-rotate-right'), " Rotate"])),
            state.selected.page !== 0 ? h('li', h('button.btn.btn-warning.navbar-btn#add-cover-btn', [h('i.fa.fa-book'), " Add photo to cover page"])) : '',
          ]),
          h('ul.nav.navbar-nav.navbar-right', [
            h('li', h('button.btn.btn-link.navbar-btn#cancel-btn', h('i.fa.fa-times.fa-lg')))
          ])
        ])) : ''
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
