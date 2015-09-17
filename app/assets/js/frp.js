/** @jsx hJSX */

import Cycle from '@cycle/core';
import {makeDOMDriver, hJSX} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import $ from "jquery"
import _ from 'underscore';


var composition = {
   "id":243,"collectionID":283,"photos":["./storage/gists/ebd66bce833bf6da9fff366ae660807f7f97686e","./storage/gists/b2437e118b4eb7670170a2da2d4d9456941e017d","./storage/gists/298c77b04eb42bff96335383ec7a06ad39977975","./storage/gists/235a97c66e2f7a7ace6c014387b3eacfd9472270","./storage/gists/cd65e025830738ada113b47e83df9ddb950e3969"],"tiles":[{"tileindex":0,"imgindex":2,"cx1":0.34927234053611755,"cx2":0.6715176701545715,"cy1":0,"cy2":1,"tx1":0.00390625,"tx2":0.3408203125,"ty1":0.005524862091988325,"ty2":0.9944751262664795},{"tileindex":1,"imgindex":4,"cx1":0,"cx2":1,"cy1":0.2741433084011078,"cy2":0.8629283308982849,"tx1":0.3447265625,"tx2":0.99609375,"ty1":0.3342541456222534,"ty2":0.6961326003074646},{"tileindex":2,"imgindex":0,"cx1":0,"cx2":1,"cy1":0.1962616890668869,"cy2":0.672897219657898,"tx1":0.3447265625,"tx2":0.99609375,"ty1":0.7016574740409851,"ty2":0.9944751262664795},{"tileindex":3,"imgindex":3,"cx1":0,"cx2":1,"cy1":0.1526479721069336,"cy2":1,"tx1":0.591796875,"tx2":0.99609375,"ty1":0.005524862091988325,"ty2":0.3287292718887329},{"tileindex":4,"imgindex":1,"cx1":0.10602910816669464,"cx2":0.8170478343963623,"cy1":0,"cy2":1,"tx1":0.3447265625,"tx2":0.587890625,"ty1":0.005524862091988325,"ty2":0.3287292718887329}]
};


function makeUploadRequest(file, collection) {
  var fd = new FormData();
  fd.append("image", file);
  return Cycle.Rx.Observable.fromPromise($.ajax({
    url: "/collections/"+collection.id+"/photos",
    method: 'POST',
    data: fd,
    processData: false,
    contentType: false
  }));
}

function  renderTile(tile, photos) {
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
            <img src={"/storage/photos/"+getFilename(photos[tile.imgindex])} draggable={false} style={imgStyle} data-idx={tile.tileindex} />
        </div>
}

function renderUpload() {
  return <div>
    <button className="btn btn-primary" id="upload-btn"><i className="fa fa-upload"></i>&nbsp; Upload photos</button>
    <button className="btn btn-default" id="reset-btn">Reset</button>
    <input type="file" name="image" id="file-input" multiple></input>
  </div>
}


function compositionIntent(DOM) {
  let eventToCoord = ev => ({
      'x': ev.screenX,
      'y': ev.screenY,
      'img': ev.target,
      'idx': ev.target['data-idx']
    });

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
  // drag$.subscribe(x => console.log(x));
  return {drag$};
}


function compositionModel(actions, state$) {
  var composition$ = state$.flatMapLatest(state => actions.drag$
    .scan((comp, drag) => {
      var moved_x = move(comp.tiles[drag.orig.idx], drag.dx / drag.img.width, 'cx1', 'cx2');
      comp.tiles[drag.orig.idx] = move(moved_x, drag.dy / drag.img.height, 'cy1', 'cy2');
      return comp;
    }, state)).share();
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


function main({DOM, HTTP}) {
  let btn$ = DOM.select('#upload-btn').events('click');
  btn$.subscribe(_ => document.getElementById('file-input').dispatchEvent(new MouseEvent('click')));
  
  var uploadFiles$ = DOM.select('#file-input').events('change').map(ev => ev.target.files);

  var getResponses$ = HTTP.filter(res$ => res$.request.method === undefined);
  var postResponses$ = HTTP.filter(res$ => res$.request.method === 'POST');

  var userResponse$ = getResponses$.filter(res$ => res$.request.match(/\/users\/\d+/)).mergeAll().map(res => res.body).shareReplay(1);
  var collectionResponse$ = postResponses$.filter(res$ => res$.request.url.match(/\/users\/\d+\/collections/)).mergeAll()
    .map(res => res.body).shareReplay(1);
  var compositionResponse$ = postResponses$.filter(res$ => res$.request.url.match(/\/collections\/\d+\/mosaics/)).mergeAll()
    .map(res => res.body).shareReplay(1);

  var userRequest$ = uploadFiles$.map(f => '/users/1');
  var collectionRequest$ = userResponse$.map(user => ({url:'/users/'+user.id+'/collections', method: 'POST', send: {}}));
  var fileUploadRequest$ = uploadFiles$
    .zip(collectionResponse$)
    .flatMap(([files, collection]) => Cycle.Rx.Observable.from(files)
        .flatMap(file => makeUploadRequest(file, collection))
        .concat(Cycle.Rx.Observable.return('end')));
  var compositionRequest$ = collectionResponse$.zip(fileUploadRequest$.filter(x => x === 'end'),
      (collection, _) => ({url: '/collections/'+collection.id+'/mosaics', method: 'POST', send: {}}));

  var requests$ = Cycle.Rx.Observable.merge(
    userRequest$,
    collectionRequest$,
    compositionRequest$
  );

  var compositionActions = compositionIntent(DOM);

  var state$ = compositionResponse$.startWith(composition);
  var composition$ = compositionModel(compositionActions, state$);

  var finalState$ = state$.merge(composition$).map(composition => ({composition}));
  // finalState$.subscribe(x => console.log(x));

  var vtree$ = finalState$.map(state => 
      <div className="container-ui limited-width">
        {renderUpload()}
        {state.composition ?
        <div className="box-mosaic">
          <div className="ui-composition shadow">
            {state.composition.tiles ? state.composition.tiles.map(tile => renderTile(tile, state.composition.photos)) : ''}
          </div>
        </div>
        : ''}
      </div>
  );
  
  return {
    DOM: vtree$,
    HTTP: requests$
  };
}


Cycle.run(main, {
  DOM: makeDOMDriver('#app'),
  HTTP: makeHTTPDriver()
});
