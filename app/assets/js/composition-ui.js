import {Rx} from '@cycle/core';
import {h} from '@cycle/dom';
import _ from 'underscore';
import Immutable from 'immutable';
import {cancelDefault} from './helpers'


function resizeTile(tile, tile2) {
  var arTile = (tile.tx2-tile.tx1) / (tile.ty2-tile.ty1);
  var arTile2 = (tile2.tx2-tile2.tx1) / (tile2.ty2-tile2.ty1);
  var arImg = (tile.cx2-tile.cx1) / (tile.cy2-tile.cy1);
  var arImg2 = arTile2 * arImg / arTile;

  var center = [(tile.cx2+tile.cx1)/2, (tile.cy2+tile.cy1)/2];
  var newTile = _.clone(tile2);
  newTile.photoID = tile.photoID;

  newTile.cx1 = 0;
  newTile.cy1 = 0;
  if (arImg2 > 1) {
    newTile.cy2 = 1/arImg2;
    newTile.cx2 = newTile.cy2*arImg2;
  } else {
    newTile.cx2 = arImg2;
    newTile.cy2 = newTile.cx2/arImg2;
  }

  var dx = Math.min(1-newTile.cx2, Math.max(0, center[0]-newTile.cx2/2));
  newTile.cx1 += dx;
  newTile.cx2 += dx;

  var dy = Math.min(1-newTile.cy2, Math.max(0, center[1]-newTile.cy2/2));
  newTile.cy1 += dy;
  newTile.cy2 += dy;

  return newTile;
}

function swapTiles(album, [page1,idx1], [page2,idx2]) {
  var tile1 = album[page1].tiles[idx1];
  var tile2 = album[page2].tiles[idx2];
  album[page2].tiles[idx2] = resizeTile(tile1, tile2);
  album[page1].tiles[idx1] = resizeTile(tile2, tile1);
  return album;
}


function isOutOfBounds(position, bounds) {
  return position[0] < bounds[0] || position[1] < bounds[1] || position[0] > bounds[2] || position[1] > bounds[3];
}

function moveTiles(targets, orientation, bounds, dx, dy, tiles) {
  var newcoord_tl = targets.topleft.map(idx => [
      tiles[idx].tx1 + dx * orientation[0],
      tiles[idx].ty1 + dy * orientation[1]
  ]);

  var newcoord_br = targets.bottomright.map(idx => [
      tiles[idx].tx2 + dx * orientation[0],
      tiles[idx].ty2 + dy * orientation[1]
  ]);

  var allcoord = newcoord_tl.concat(newcoord_br);
  var allindices = targets.topleft.concat(targets.bottomright);

  var is_out = allcoord.map(coord => isOutOfBounds(coord, bounds))
    .reduce((res, current) => res || current);

  if (is_out) return tiles;

  return tiles.map((tile,index) => {
    let i = targets.topleft.indexOf(index);
    if (i !== -1) {
      return resizeTile(_.clone(tile), _.extend(tile, {
        tx1: newcoord_tl[i][0],
        ty1: newcoord_tl[i][1],
      }));
    }

    let j = targets.bottomright.indexOf(index);
    if (j !== -1) {
      return resizeTile(_.clone(tile), _.extend(tile, {
        tx2: newcoord_br[j][0],
        ty2: newcoord_br[j][1]
      }));
    }

    return tile;
  });
}

function getOrientation(tiles, indices, prop) {
  return indices.map(function(idx) {
    return tiles[idx][prop];
  }).reduce(function(prev, curr) {
    return (prev === curr) ? prev : false;
  }) ? [1,0] : [0,1];
}

function findOrientation(tl, br, tiles) {
  if (Math.min(tl.length, br.length) === 0) return [0,0];
  if (tl.length === br.length && tl.length === 1) {
    var tile_tl = tiles[tl[0]];
    var tile_br = tiles[br[0]];
    return (Math.abs(tile_tl.ty1-tile_br.ty2) < Math.abs(tile_tl.tx1-tile_br.tx2)) ? [0,1] : [1,0];
  }

  if (tl.length >= br.length) {
    return getOrientation(tiles, tl, 'tx1');
  } else {
    return getOrientation(tiles, br, 'tx2');
  }
}

function findTargets(xn, yn, tiles) {
  var tl_targets = [];
  var br_targets = [];
  var best1 = Infinity,
  best2 = Infinity;

  for (var i = 0; i < tiles.length; i++) {
    var dy1 = Math.abs(yn - tiles[i].ty1);
    var dx1 = Math.abs(xn - tiles[i].tx1);
    var dy2 = Math.abs(yn - tiles[i].ty2);
    var dx2 = Math.abs(xn - tiles[i].tx2);
    var min1 = Math.min(dy1, dx1);
    var min2 = Math.min(dy2, dx2);

    if (min1 < min2) {
      if (min1 < best1) {
        tl_targets = [];
        best1 = min1;
      }
      if (min1 == best1) {
        tl_targets.push(i);
      }
    } else {
      if (min2 < best2) {
        br_targets = [];
        best2 = min2;
      }
      if (min2 == best2) {
        br_targets.push(i);
      }
    }
  }

  return {
    'topleft': tl_targets,
    'bottomright': br_targets,
  };
}

function compare_min(a,b) { return a-b; }
function compare_max(a,b) { return b-a; }

function findBounds(tl, br, orientation, tiles) {
  var tl_tiles = tl.map(function(i){ return tiles[i]; });
  var br_tiles = br.map(function(i){ return tiles[i]; });

  var m = 0.05;
  return [
    (br_tiles.map(function(tile){ return tile.tx1; }).sort(compare_max)[0] + m) * orientation[0],
    (br_tiles.map(function(tile){ return tile.ty1; }).sort(compare_max)[0] + m) * orientation[1],
    Math.max((tl_tiles.map(function(tile){ return tile.tx2; }).sort(compare_min)[0] - m), 1-orientation[0]),
    Math.max((tl_tiles.map(function(tile){ return tile.ty2; }).sort(compare_min)[0] - m), 1-orientation[1])
  ];
}


function dragTile(tile, dx, dy, img) {
  var moved_x = move(tile, dx / img.width, 'cx1', 'cx2');
  var moved_xy = move(moved_x, dy / img.height, 'cy1', 'cy2');
  return moved_xy;
}

function eventToCoord(ev) {
  return {
    'x': ev.screenX,
    'y': ev.screenY,
    'img': ev.target,
    'idx': ev.target['data-idx'],
    'page': ev.target['data-page']
  };
}


function move(tile, offset, prop1, prop2) {
  var out = _.clone(tile);
  var loc = out[prop1];
  var original_size = out[prop2] - out[prop1];
  out[prop1] = Math.max(0, out[prop1] - offset);
  out[prop2] = out[prop1] + original_size;
  if (out[prop2] > 1) {
    out[prop1] = loc;
    out[prop2] = loc + original_size;
  }
  return out;
}


function pageIntent(DOM) {
  let mouseDown$ = DOM.select('.box-mosaic').events('mousedown').map(cancelDefault);
  let mouseUp$ = DOM.select('.box-mosaic').events('mouseup').map(cancelDefault);
  let mouseMove$ = DOM.select('.box-mosaic').events('mousemove').map(cancelDefault);

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
    let targets = findTargets(x, y, tiles);
    let orientation = findOrientation(targets.topleft, targets.bottomright, tiles);
    let bounds = findBounds(targets.topleft, targets.bottomright, orientation, tiles);
    album[page].move = {targets, orientation, bounds, page};
    return album;
  });

  let dragFunc$ = actions.drag$.map(drag => album => {
    let params = album[drag.down.page].move;
    let newtiles = moveTiles(params.targets, params.orientation, params.bounds, drag.dx, drag.dy, album[params.page].tiles);
    album[params.page].tiles = newtiles;
    return album;
  });

  return Rx.Observable.merge(dragFunc$, paramFunc$);
}


function cropIntent(DOM) {
  var mouseDown$ = DOM.select('.ui-tile').events('mousedown').map(cancelDefault).map(eventToCoord).share();
  var mouseUp$ = DOM.select('.ui-tile').events('mouseup').map(cancelDefault);
  var mouseMove$ = DOM.select('.ui-tile').events('mousemove').map(cancelDefault).map(eventToCoord).share();
  var mouseEnter$ = DOM.select('.ui-tile img').events('mouseenter').map(cancelDefault).map(eventToCoord);


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
    var moved_x = move(album[drag.page].tiles[drag.idx], drag.dx / drag.img.width, 'cx1', 'cx2');
    album[drag.page].tiles[drag.idx] = move(moved_x, drag.dy / drag.img.height, 'cy1', 'cy2');
    return album;
  });

  var swapFunc$ = actions.swap$.map(([prev,swap]) => album => {
    if (prev) { album = swapTiles(album, [prev.from.page, prev.from.idx], [prev.to.page, prev.to.idx]); }
    if (swap) { album = swapTiles(album, [swap.from.page, swap.from.idx], [swap.to.page, swap.to.idx]); }
    return album;
  });


  return Rx.Observable.merge(dragFunc$, swapFunc$);
}


module.exports = function(DOM) {
  return Rx.Observable.merge(
      cropModel(cropIntent(DOM)),
      pageModel(pageIntent(DOM)));
}
