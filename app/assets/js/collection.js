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
      [d.stream('set')], set
    );

    function set(collection, newCollection) {
      return newCollection;
    }

    function uploadOne(collection, file) {
      return addPhoto(collection.id, file).map(_ => collection)
    }

    function uploadAll(collection, files) {
      d.plug('set', userP
        .filter(x => !_.isUndefined(x))
        .flatMap(getCollection)
        .flatMap(col => {
          var stream = Bacon.fromArray(toArray(files))
            .flatMap(f => uploadOne(col, f))
          stream.onEnd(_ => Composition.generate(col));
          return stream;
        }));
      User.getCurrent();
    }
  },

  addFiles(ev) { d.push('uploadAll', ev.target.files) },
}

function getCollection(user) {
  return Bacon.fromPromise($.post("/users/"+user.id+"/collections"));
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
