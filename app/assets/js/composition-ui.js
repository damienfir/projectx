/** @jsx hJSX */

import {hJSX} from '@cycle/dom';
import _ from 'underscore';


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
  var drag$ = mouseDown$.flatMapLatest(down => 
      mouseMove$.takeUntil(mouseUp$)
      .scan((prev, curr) => {
        var out = _.clone(curr);
        out.dx = curr.x-prev.x;
        out.dy = curr.y-prev.y;
        return out;
      }, down)
      .map(mm => _.extend(mm, {orig: down})));

  return {drag$};
}


function model(actions, album$) {
  var composition$ = album$.flatMapLatest(album => actions.drag$
    .scan((alb, drag) => {
      var moved_x = move(alb[drag.orig.page].tiles[drag.orig.idx], drag.dx / drag.img.width, 'cx1', 'cx2');
      alb[drag.orig.page].tiles[drag.orig.idx] = move(moved_x, drag.dy / drag.img.height, 'cy1', 'cy2');
      return alb;
    }, album)).share();
  return composition$;
}


function dragTile(tile, dx, dy, img) {
  var moved_x = move(tile, dx / img.width, 'cx1', 'cx2');
  var moved_xy = move(moved_x, dy / img.height, 'cy1', 'cy2');
  return moved_xy;
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
            <img src={"/storage/photos/"+getFilename(composition.photos[tile.imgindex])} draggable={false} style={imgStyle} data-page={composition.index} data-idx={tile.tileindex} />
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
