const React = require("react"),
      Bacon = require('baconjs');

const Collection = require('./collection'),
      Composition = require('./composition'),
      User = require('./user'),
      UI = require('./components');


var userStream = User.toProperty({});
var collectionStream = Collection.toProperty({}, userStream);
var compositionStream = Composition.toProperty({tiles: [], photos: []});

var stream = Bacon.combineTemplate({
  user: userStream,
  collection: collectionStream,
  composition: compositionStream
});

stream.log()

stream.onValue((state) => {
  React.render(<UI {...state} />, document.getElementById("app"));
});
