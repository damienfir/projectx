import Rx from 'rx';
import {h} from '@cycle/dom';
import {cancelDefault} from './helpers'

import * as utils from './utils'



function eventToCoord(ev) {
  return {
    'x': ev.screenX,
    'y': ev.screenY,
    'img': ev.target,
    'idx': ev.target.parentNode['data-idx'],
    'page': ev.target.parentNode['data-page']
  };
}


function pageIntent(DOM) {
  let mouseDown$ = DOM.select('.move-mosaic').events('mousedown').filter(ev => _.contains(ev.target.classList, 'move-mosaic'));
  let mouseUp$ = DOM.select('.move-mosaic').events('mouseup');
  let mouseMove$ = DOM.select('.move-mosaic').events('mousemove');

  let down$ = mouseDown$.map(ev => _.extend(ev.target, {
    x: ev.offsetX/ev.target.offsetWidth,
    y: ev.offsetY/ev.target.offsetHeight,
    page: ev.target['data-page']
  }));

  let drag$ = down$.flatMapLatest(down =>
    mouseMove$.takeUntil(mouseUp$)
    .pairwise()
    .map(([prev,move]) => ({
      dx: (move.screenX - prev.screenX) / down.offsetWidth,
      dy: (move.screenY - prev.screenY) / down.offsetHeight,
      down
    })));

  return {down$, drag$};
}


function pageModel(actions) {
  let paramFunc$ = actions.down$.map(({ev,x,y,page}) => album => {
    let tiles = album[page].tiles;
    let targets = utils.findTargets(x, y, tiles);
    let orientation = utils.findOrientation(targets.topleft, targets.bottomright, tiles);
    let bounds = utils.findBounds(targets.topleft, targets.bottomright, orientation, tiles);
    album[page].move = {targets, orientation, bounds, page};
    return album;
  });

  let dragFunc$ = actions.drag$.map(drag => album => {
    let params = album[drag.down.page].move;
    let newtiles = utils.moveTiles(params.targets, params.orientation, params.bounds, drag.dx, drag.dy, album[params.page].tiles);
    album[params.page].tiles = newtiles;
    return album;
  });

  return Rx.Observable.merge(dragFunc$, paramFunc$);
}


function cropIntent(DOM) {
  var mouseDown$ = DOM.select('.ui-tile').events('mousedown').map(eventToCoord);
  var mouseUp$ = DOM.select(':root').events('mouseup');
  var mouseMove$ = DOM.select('.ui-tile').events('mousemove').map(eventToCoord);
  var mouseEnter$ = DOM.select('.ui-tile img').events('mouseenter').map(eventToCoord);


  var drag$ = mouseDown$.flatMapLatest(down => 
      mouseMove$.takeUntil(mouseUp$)
        .pairwise()
        .map(([prev, curr]) => _.extend(curr, {
          dx: curr.x-prev.x,
          dy: curr.y-prev.y
        }))
      .map(mm => _.extend(mm, {orig: down}))
      .concat(Rx.Observable.return(false)));

  var swap$ = mouseEnter$.withLatestFrom(drag$, (enter, drag) => [enter, drag])
    .filter(([enter, drag]) => drag)
    .map(([enter, drag]) => ({from: drag.orig, to: enter}))
    .map(curr => ([old, prev]) => {
      if (curr.from.idx === curr.to.idx && curr.from.page === curr.to.page) {
        return [prev, false];
      } else {
        return [prev, curr];
      }
    })
    .merge(drag$.filter(x => !x).map(x => state => [false, false]))
    .scan((swap, func) => func(swap), [false, false])
    .filter(([prev,curr]) => prev || curr);

  return {drag$: drag$.filter(x => x), swap$};
}


function cropModel(actions) {
  var dragFunc$ = actions.drag$.map(drag => album => {
    var moved_x = utils.move(album[drag.orig.page].tiles[drag.orig.idx], drag.dx / drag.img.width, 'cx1', 'cx2');
    album[drag.orig.page].tiles[drag.orig.idx] = utils.move(moved_x, drag.dy / drag.img.height, 'cy1', 'cy2');
    return album;
  });

  var swapFunc$ = actions.swap$.map(([prev,swap]) => album => {
    if (prev) { album = utils.swapTiles(album, [prev.from.page, prev.from.idx], [prev.to.page, prev.to.idx]); }
    if (swap) { album = utils.swapTiles(album, [swap.from.page, swap.from.idx], [swap.to.page, swap.to.idx]); }
    return album;
  });

  return Rx.Observable.merge(dragFunc$);//, swapFunc$);
}


module.exports = function(DOM) {
  let actions = {
    crop: cropIntent(DOM),
    edge: pageIntent(DOM)
  }

  return {
    actions,
    state$: Rx.Observable.merge(
      cropModel(actions.crop),
      pageModel(actions.edge))
  };
}
