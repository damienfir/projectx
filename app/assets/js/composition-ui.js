/** @jsx hJSX */

import {Rx} from '@cycle/core';
import {hJSX} from '@cycle/dom';
import _ from 'underscore';
import Immutable from 'immutable';


function resizeTile(tile, tile2) {

  var arTile = (tile.tx2-tile.tx1) / (tile.ty2-tile.ty1);
  var arTile2 = (tile2.tx2-tile2.tx1) / (tile2.ty2-tile2.ty1);
  var arImg = (tile.cx2-tile.cx1) / (tile.cy2-tile.cy1);
  var arImg2 = arTile2 * arImg / arTile;

  var center = [(tile.cx2+tile.cx1)/2, (tile.cy2+tile.cy1)/2];
  var newTile = _.clone(tile2);
  newTile.img = tile.img;

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
  var tile1Resized = resizeTile(tile1, tile2);
  var tile2Resized = resizeTile(tile2, tile1);
  album[page2].tiles[idx2] = tile1Resized;
  album[page1].tiles[idx1] = tile2Resized;
  return album;
}


// function isOutOfBounds(position, bounds) {
//   return position[0] < bounds[0] || position[1] < bounds[1] || position[0] > bounds[2] || position[1] > bounds[3];
// }

// function moveTiles(targets, orientation, bounds, dx, dy) {
//   var tile_tl = targets.topleft.map(function(idx){ return $scope.composition.tiles[idx]; });
//   var tile_br = targets.bottomright.map(function(idx){ return $scope.composition.tiles[idx]; });

//   var newcoord_tl = tile_tl.map(function(tile){
//     return [
//       tile.tx1 + dx * orientation[0],
//       tile.ty1 + dy * orientation[1]
//     ];
//   });

//   var newcoord_br = tile_br.map(function(tile) {
//     return [
//       tile.tx2 + dx * orientation[0],
//       tile.ty2 + dy * orientation[1]
//     ];
//   });

//   var is_out = newcoord_tl.concat(newcoord_br).map(function(coord){
//     return isOutOfBounds(coord, bounds);
//   }).reduce(function(res, current) {
//     return res || current;
//   });

//   if (!is_out) {
//     targets.topleft.forEach(function(idx, i) {
//       resizeTile(idx, {
//         tx1: newcoord_tl[i][0],
//         ty1: newcoord_tl[i][1],
//         tx2: tile_tl[i].tx2,
//         ty2: tile_tl[i].ty2
//       });
//     });
//     targets.bottomright.forEach(function(idx, i) {
//       resizeTile(idx, {
//         tx1: tile_br[i].tx1,
//         ty1: tile_br[i].ty1,
//         tx2: newcoord_br[i][0],
//         ty2: newcoord_br[i][1]
//       });
//     });
//   }
// }

// function getOrientation(tiles, prop) {
//   return tiles.map(function(idx) {
//     return $scope.composition.tiles[idx][prop];
//   }).reduce(function(prev, curr) {
//     return (prev === curr) ? prev : false;
//   }) ? [1,0] : [0,1];
// }

// function findOrientation(tl, br) {
//   if (Math.min(tl.length, br.length) === 0) return [0,0];
//   if (tl.length === br.length && tl.length === 1) {
//     var tile_tl = $scope.composition.tiles[tl[0]];
//     var tile_br = $scope.composition.tiles[br[0]];
//     return (Math.abs(tile_tl.ty1-tile_br.ty2) < Math.abs(tile_tl.tx1-tile_br.tx2)) ? [0,1] : [1,0];
//   }

//   if (tl.length >= br.length) {
//     return getOrientation(tl, 'tx1');
//   } else {
//     return getOrientation(br, 'tx2');
//   }
// }

// function findTargets(xn, yn) {
//   var tl_targets = [];
//   var br_targets = [];
//   var tiles = $scope.composition.tiles;
//   var best1 = Infinity,
//   best2 = Infinity;

//   for (var i = 0; i < tiles.length; i++) {
//     var dy1 = Math.abs(yn - tiles[i].ty1);
//     var dx1 = Math.abs(xn - tiles[i].tx1);
//     var dy2 = Math.abs(yn - tiles[i].ty2);
//     var dx2 = Math.abs(xn - tiles[i].tx2);
//     var min1 = Math.min(dy1, dx1);
//     var min2 = Math.min(dy2, dx2);

//     if (min1 < min2) {
//       if (min1 < best1) {
//         tl_targets = [];
//         best1 = min1;
//       }
//       if (min1 == best1) {
//         tl_targets.push(i);
//       }
//     } else {
//       if (min2 < best2) {
//         br_targets = [];
//         best2 = min2;
//       }
//       if (min2 == best2) {
//         br_targets.push(i);
//       }
//     }
//   }

//   return {
//     'topleft': tl_targets,
//     'bottomright': br_targets,
//   };
// }

// function findBounds(tl, br, orientation) {
//   var tl_tiles = tl.map(function(i){ return $scope.composition.tiles[i]; });
//   var br_tiles = br.map(function(i){ return $scope.composition.tiles[i]; });

//   var m = 0.05;
//   return [
//     (br_tiles.map(function(tile){ return tile.tx1; }).sort(compare_max)[0] + m) * orientation[0],
//     (br_tiles.map(function(tile){ return tile.ty1; }).sort(compare_max)[0] + m) * orientation[1],
//     Math.max((tl_tiles.map(function(tile){ return tile.tx2; }).sort(compare_min)[0] - m), 1-orientation[0]),
//     Math.max((tl_tiles.map(function(tile){ return tile.ty2; }).sort(compare_min)[0] - m), 1-orientation[1])
//   ];
// }


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

function intent(DOM) {
  var mouseDown$ = DOM.select('.ui-tile').events('mousedown').map(eventToCoord);
  var mouseUp$ = DOM.select('.ui-tile').events('mouseup');
  var mouseMove$ = DOM.select('.ui-tile').events('mousemove').map(eventToCoord);
  var mouseEnter$ = DOM.select('.ui-tile img').events('mouseenter').map(eventToCoord);

  var drag$ = mouseDown$.flatMapLatest(down => 
      mouseMove$.takeUntil(mouseUp$)
      .scan((prev, curr) => {
        var out = _.clone(curr);
        out.dx = curr.x-prev.x;
        out.dy = curr.y-prev.y;
        return out;
      }, down)
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


function model(actions) {
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


function  renderTile(tile, composition) {
  function percent(x) { return x * 100 + "%"; }
  function getFilename(path) { return path.split('/').pop() }

  var scaleX = 1 / (tile.cx2 - tile.cx1);
  var scaleY = 1 / (tile.cy2 - tile.cy1);

  var imgStyle = {
    height: percent(scaleY),
    width: percent(scaleX),
    top: percent(-tile.cy1 * scaleY),
    left: percent(-tile.cx1 * scaleX)
  };

  var tileStyle = {
    height: percent(tile.ty2 - tile.ty1),
    width: percent(tile.tx2 - tile.tx1),
    top: percent(tile.ty1),
    left: percent(tile.tx1)
  };

  return <div className="ui-tile" style={tileStyle}>
            <img src={"/storage/photos/"+getFilename(tile.img)} draggable={false} style={imgStyle} data-page={composition.index} data-idx={tile.tileindex} />
        </div>
}


function view(album) {
  return album.map(composition =>
    <div className="box-mosaic">
        <div className="ui-composition shadow">
          {composition.tiles ? composition.tiles.map(tile => renderTile(tile, composition)) : ''}
        </div>
      </div>
  );
}


module.exports = {model, intent, view}
