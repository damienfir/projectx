import {List, Map, fromJS} from 'immutable';

var arPaper = Math.sqrt(2);

function resizeTile(tile, tile2, transpose) {
  var arTile = arPaper * (tile.tx2-tile.tx1) / (tile.ty2-tile.ty1);
  var arImg = arTile / ((tile.cx2-tile.cx1) / (tile.cy2-tile.cy1));

  var arTile2 = arPaper * (tile2.tx2-tile2.tx1) / (tile2.ty2-tile2.ty1);
  if (transpose) arImg = 1/arImg;

  var center = [(tile.cx2+tile.cx1)/2, (tile.cy2+tile.cy1)/2];
  var newTile = _.clone(tile2);
  newTile.photoID = tile.photoID;

  newTile.cx1 = 0;
  newTile.cy1 = 0;
  if (arImg < arTile2) {
    newTile.cx2 = 1.0;
    newTile.cy2 = arImg/arTile2;
  } else {
    newTile.cx2 = arTile2/arImg;
    newTile.cy2 = 1.0;
  }

  var dx = Math.min(1-newTile.cx2, Math.max(0, center[0]-newTile.cx2/2));
  newTile.cx1 += dx;
  newTile.cx2 += dx;

  var dy = Math.min(1-newTile.cy2, Math.max(0, center[1]-newTile.cy2/2));
  newTile.cy1 += dy;
  newTile.cy2 += dy;

  return newTile;
}


function transposeTile(tile) {
  let newTile = _.clone(tile);
  newTile.tx1 = tile.ty1;
  newTile.ty1 = tile.tx1;
  newTile.tx2 = tile.ty2;
  newTile.ty2 = tile.tx2;
  return newTile;
}

function transposeAll(tile) {
  let newTile = transposeTile(tile);
  newTile.cx1 = tile.cy1;
  newTile.cy1 = tile.cx1;
  newTile.cx2 = tile.cy2;
  newTile.cy2 = tile.cx2;
  return newTile;
}

export function rotateTile(tile) {
  // tile = transposeAll(resizeTile(tile, transposeTile(tile), true));
  tile = resizeTile(tile, tile, true);
  tile.rot = ((tile.rot || 0) + 90) % 360;
  return tile;
}

export function swapTiles(album, [page1,idx1], [page2,idx2]) {
  var tile1 = album[page1].tiles[idx1];
  var tile2 = album[page2].tiles[idx2];
  if (tile1 && tile2) {
    album[page2].tiles[idx2] = resizeTile(tile1, tile2);
    album[page1].tiles[idx1] = resizeTile(tile2, tile1);
  }
  return album;
}


export function move(tile, offset, prop1, prop2) {
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


let margin = 0.05;

export function getParams(tiles, x, y) {
  let tiles2 = tiles.map((t,i) => ({t,i}));
  let move_x_tl = tiles2.filter(({t,i}) => Math.abs(t.get('tx1')-x) < margin).map(({t,i}) => i);
  let move_x_br = tiles2.filter(({t,i}) => Math.abs(t.get('tx2')-x) < margin).map(({t,i}) => i);
  let move_y_tl = tiles2.filter(({t,i}) => Math.abs(t.get('ty1')-y) < margin).map(({t,i}) => i);
  let move_y_br = tiles2.filter(({t,i}) => Math.abs(t.get('ty2')-y) < margin).map(({t,i}) => i);
  return {move_x_tl, move_y_tl, move_x_br, move_y_br};
}

let d = 0.1;


export function dragTiles(tiles, params, dx, dy) {
  let canMoveX = params.move_x_tl.size > 0 && params.move_x_br.size > 0;
  let canMoveY = params.move_y_tl.size > 0 && params.move_y_br.size > 0;
  let newTiles = tiles
    .map((t,i) => params.move_x_tl.includes(i) && canMoveX ? t.update('tx1', x => x+dx) : t)
    .map((t,i) => params.move_x_br.includes(i) && canMoveX ? t.update('tx2', x => x+dx) : t)
    .map((t,i) => params.move_y_tl.includes(i) && canMoveY ? t.update('ty1', x => x+dy) : t)
    .map((t,i) => params.move_y_br.includes(i) && canMoveY ? t.update('ty2', x => x+dy) : t);

  if (newTiles.map(t => [t.get('tx2')-t.get('tx1'), t.get('ty2')-t.get('ty1')]).some(([w,h]) => w < d || h < d)) {
    return tiles;
  }

  return tiles.map(x => x.toJS()).zip(newTiles.map(x => x.toJS())).map(([a,b]) => fromJS(resizeTile(a,b)));
}
