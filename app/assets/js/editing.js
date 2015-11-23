// import {h} from '@cycle/dom';
import helpers from './helpers'

let pageAndIndex = (ev) => ({page: ev.target.parentNode['data-page'], index: ev.target.parentNode['data-idx']})

let eventToCoord = (ev) => ({
    'x': ev.screenX,
    'y': ev.screenY,
    'img': ev.target,
    'idx': ev.target.parentNode['data-idx'],
    'page': ev.target.parentNode['data-page']
})


function intent(DOM) {
  let tiles = DOM.select('.ui-tile');
  let tileDown$ = tiles.events('mousedown').map(eventToCoord);
  let tileUp$ = tiles.events('mouseup').map(eventToCoord);
  let mouseUp$ = DOM.select(':root').events('mouseup');
  let mouseMove$ = DOM.select(':root').events('mousemove').map(helpers.cancel);
  let edgeDown$ = DOM.select('.move-mosaic').events('mousedown')
    .filter(ev => _.contains(ev.target.classList, 'move-mosaic'));


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
        .map(false)
        .take(1));

  let mouseOver$ = tileUp$
    .merge(cancel$)
    .bufferWithCount(2)
    .map(([from,to]) => ({from, to}))
    .filter(({from,to}) => !_.isEqual(from,to) && from && to);

  let swap$ = mouseOver$.filter(({from,to}) => from.page === to.page);
  let move$ = mouseOver$.filter(({from,to}) => from.page !== to.page);
  
  // let move$ = tileDown$
  //   .flatMapLatest(from => tileUp$
  //       .filter(to => to.page !== from.page)
  //       .take(1)
  //       .map([from, to]));

  let drag$ = tileDown$.flatMapLatest(down => mouseMove$
      .takeUntil(mouseUp$)
      .pairwise()
      .map(([prev, curr]) => _.extend(curr, {
        dx: (curr.x-prev.x) / down.img.width,
        dy: (curr.y-prev.y) / down.img.height,
        page: down.page,
        idx: down.idx,
      })));

  return {swap$, move$, drag$, clickEdge$, dragEdge$};
}


module.exports = function(DOM) {

  let actions = intent(DOM);

  return {
    actions
  }
}
