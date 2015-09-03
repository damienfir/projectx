const Dispatcher = require('./dispatcher')
const Bacon = require('baconjs')
const $ = require("jquery");
const _ = require('underscore')


var d = new Dispatcher();

var Collection = {
  toProperty(initial) {
    var uploadOne = d.stream('uploadOne').scan(initial, (collection, file) => {
      console.log(initial);
      console.log(collection);
      console.log(file);
      addPhoto(collection.id, file).flatMap(filename => {
        return {id: 1, photos: ['a']}
        // _.extend(collection, {files: [filename]})
      })
    })

    var uploadAll = d.stream("uploadAll")
      .flatMap(files => {
        getUser()
          .flatMap(getCollection)
          .flatMap(() => Bacon.fromArray(files))
      })
      .flatMap(f => d.push('uploadOne', f))

    return Bacon.mergeAll(uploadOne, uploadAll);
  },

  addFiles(ev) { d.push('uploadAll', [{f:1}]) },
}


function getUser() {
  return Bacon.constant({email: 'damien'});
}

function getCollection(user) {
  return Bacon.constant({id: 1, photos: []});
}

function addPhotos(collection, files) {
  return Bacon.fromArray(files)
    .flatMap(file => Bacon.fromPromise(addPhoto(collection.id, file)))
    .mapEnd(() => collection)
}

function addPhoto(collectionID, file) {
  // var fd = new FormData();
  // fd.append("image", file);
  // return Bacon.fromPromise($.post("/collections/"+collectionID+"/photos", fd));
  return Bacon.once('cat.jpg');
}

module.exports = Collection;
