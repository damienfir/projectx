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


function transpose(tile) {
  let newTile = _.clone(tile);
  newTile.tx1 = tile.ty1;
  newTile.ty1 = tile.tx1;
  newTile.tx2 = tile.ty2;
  newTile.ty2 = tile.tx2;
  return newTile;
}


export function swapTiles(album, [page1,idx1], [page2,idx2]) {
  var tile1 = album[page1].tiles[idx1];
  var tile2 = album[page2].tiles[idx2];
  album[page2].tiles[idx2] = resizeTile(tile1, tile2);
  album[page1].tiles[idx1] = resizeTile(tile2, tile1);
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
  let move_x_tl = tiles2.filter(({t,i}) => Math.abs(t.tx1-x) < margin).map(({t,i}) => i);
  let move_x_br = tiles2.filter(({t,i}) => Math.abs(t.tx2-x) < margin).map(({t,i}) => i);
  let move_y_tl = tiles2.filter(({t,i}) => Math.abs(t.ty1-y) < margin).map(({t,i}) => i);
  let move_y_br = tiles2.filter(({t,i}) => Math.abs(t.ty2-y) < margin).map(({t,i}) => i);
  return {move_x_tl, move_y_tl, move_x_br, move_y_br};
}

let d = 0.15;

export function dragTiles(tiles, params, dx, dy) {
  let newTiles = tiles
    .map((t,i) => _.contains(params.move_x_tl,i) ? _.extend(_.clone(t), {tx1: t.tx1+dx}) : t)
    .map((t,i) => _.contains(params.move_x_br,i) ? _.extend(_.clone(t), {tx2: t.tx2+dx}) : t)
    .map((t,i) => _.contains(params.move_y_tl,i) ? _.extend(_.clone(t), {ty1: t.ty1+dy}) : t)
    .map((t,i) => _.contains(params.move_y_br,i) ? _.extend(_.clone(t), {ty2: t.ty2+dy}) : t);

  if (_.some(newTiles.map(t => [t.tx2-t.tx1, t.ty2-t.ty1]), ([w,h]) => w < d || h < d))
    return tiles;

  return _.zip(tiles, newTiles).map(([a,b]) => resizeTile(a,b));
}
