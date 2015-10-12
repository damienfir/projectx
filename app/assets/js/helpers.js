import _ from 'underscore';

var initial = {
  user: {},
  collection: {},
  album: []
};


function toArray(filelist) {
  var list = [];
  for (var i = 0; i < filelist.length; i++) list.push(filelist[i]);
  return list;
}


let isNotEmpty = obj => !_.isEmpty(obj)
let asc = (a,b) => a - b
let apply = (state, func) => func(state)
let log = x => console.log(x)
let argArray = (a,b) => [a,b]

let hasNoID = x => _.isUndefined(x.id)
let hasID = x => !_.isUndefined(x.id) && x.id !== null

let jsonGET = (HTTP, regex) =>
  HTTP.filter(res$ => res$.request.method === undefined)
    .filter(res$ => res$.request.match(regex))
    .mergeAll().map(res => res.body).share();

let jsonPOST = (HTTP, regex) =>
  HTTP.filter(res$ => res$.request.method === 'POST')
    .filter(res$ => res$.request.url.match(regex))
    .mergeAll().map(res => res.body).share();


module.exports = {jsonGET, jsonPOST, apply, toArray, argArray, initial, hasID, hasNoID, asc}
