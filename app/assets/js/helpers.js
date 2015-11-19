import demo from './demo'


let UI = {
  initial: 1 << 0,
  uploadBox: 1 << 1,
  uploading: 1 << 2,
  processing: 1 << 3
}

let initial = {
  user: {},
  collection: {},
  album: [],
  photos: [],
  upload: {},
  ui: {state: UI.initial}
}

let cancelDefault = (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
  return ev;
}

let demoID = parseInt(document.getElementById("demo-id").value);

let isNotEmpty = obj => !_.isEmpty(obj)

let asc = (a,b) => a - b

let ascIndex = (a,b) => asc(a.index,b.index)

let apply = (state, func) => func(state)

let btn = (DOM, selector) => DOM.select(selector).events('click').map(cancelDefault)

let log = x => console.log(x)

let argArray = (a,b) => [a,b]

let hasNoID = x => _.isUndefined(x.id)

let hasID = x => !_.isUndefined(x.id) && x.id !== null

let jsonGETResponse = (HTTP, regex) =>
  HTTP.filter(res$ => res$.request.method === undefined)
    .filter(res$ => res$.request.match(regex))
    .mergeAll().share();

let jsonGET = (HTTP, regex) => jsonGETResponse(HTTP, regex).map(res => res.body)

let jsonPOSTResponse = (HTTP, regex) =>
  HTTP.filter(res$ => res$.request.method === 'POST')
    .filter(res$ => res$.request.url.match(regex))
    .mergeAll().share();

let jsonPOST = (HTTP, regex) => jsonPOSTResponse(HTTP, regex).map(res => res.body)

let jsonRes = (HTTP, regex) => HTTP.filter(res$ =>
    res$.request.method ?
      res$.request.url.match(regex) :
      res$.request.match(regex))
  .mergeAll().share();

let json = (HTTP, regex) => jsonRes(HTTP, regex).map(res => res.body)

let hashMap = (photos) => {
  if (!photos) return {};
  if (!_.isArray(photos)) return photos;
  return _.object(photos.map(p => [p.id, p.hash]));
}

let toArray = (filelist) => {
  var list = [];
  for (var i = 0; i < filelist.length; i++) list.push(filelist[i]);
  return list;
}


module.exports = {
  asc,
  apply,
  btn,
  cancelDefault,
  cancel: cancelDefault,
  argArray,
  initial,
  jsonRes,
  json,
  jsonGET,
  jsonPOST,
  jsonGETResponse,
  jsonPOSTResponse,
  hasID,
  hasNoID,
  hashMap,
  toArray,
  UI,
  demoID
}
