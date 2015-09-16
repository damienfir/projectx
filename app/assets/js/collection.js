import Bacon from 'baconjs'
import $ from "jquery"
import _ from 'underscore'

import Dispatcher from './dispatcher'
import Composition from './composition'
import User from './user'


var d = new Dispatcher();

var Collection = {
  toProperty(initial, userP) {
    return Bacon.update(initial,
      [d.stream('uploadAll')], uploadAll,
      [d.stream('setState')], setState
    );

    function setState(previous, state) {
      return state;
    }

    function setUser(state, user) {
      return _.extend(state, {user});
    }

    function setCollection(state, collection) {
      return _.extend(state, {collection});
    }

    function setComposition(state, composition) {
      return _.extend(state, {composition});
    }

    function getUser(state) {
      if (_.isUndefined(state.user) || _.isEmpty(state.user)) {
        return Bacon.fromPromise($.get("/users/1")).fold(state, setUser);
      }
      return Bacon.once(state);
    }

    function getCollection(state) {
      if (_.isEmpty(state.collection)) {
        return Bacon.fromPromise($.post("/users/"+state.user.id+"/collections")).fold(state, setCollection);
      }
      return Bacon.once(state);
    }

    function generateComposition(state) {
      var out = Bacon.fromPromise($.post("/collections/"+state.collection.id+"/mosaics")).fold(state, setComposition);
      d.plug('setState', out);
      return state
    }

    function uploadToCollection(state, files) {
      return Bacon.fromArray(toArray(files))
        .flatMap(f => addPhoto(state.collection.id, f).map(_ => state))
    }

    function uploadAll(state, files) {
      var out = getUser(state)
        .flatMapLatest(getCollection)
        .flatMapLatest(st => {
          return uploadToCollection(state, files).mapEnd(_ => generateComposition(st));
        });
      // out.log();
      d.plug('setState', out);
      return state;
    }
  },

  addFiles(ev) { d.push('uploadAll', ev.target.files) },

  reset(ev) { d.push('setState', {}) }
}

function addPhoto(collectionID, file) {
  var fd = new FormData();
  fd.append("image", file);
  return Bacon.fromPromise($.ajax({
    url: "/collections/"+collectionID+"/photos", fd,
    method: 'POST',
    data: fd,
    processData: false,
    contentType: false
  }));
}

function toArray(filelist) {
  var list = [];
  for (var i = 0; i < filelist.length; i++) list.push(filelist[i]);
  return list;
}

module.exports = Collection;
