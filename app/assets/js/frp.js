const React = require("react"),
      Bacon = require('baconjs');

const collection = require('./collection'),
      composition = require('./composition'),
      UI = require('./components');


var collectionStream = collection.toProperty({});
// var compositionStream = composition.toProperty({});

var stream = Bacon.combineTemplate({
  collection: collectionStream,
  // composition: compositionStream
});


stream.onValue((state) => {
  console.log(state);
  React.render(<UI {...state} />, document.getElementById("app"));
});
