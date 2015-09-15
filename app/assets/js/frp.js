const React = require("react"),
      Bacon = require('baconjs'),
      _ = require("underscore");

const Collection = require('./collection'),
      Composition = require('./composition'),
      User = require('./user'),
      UI = require('./components');


var composition = {
   "id":243,"collectionID":283,"photos":["./storage/gists/ebd66bce833bf6da9fff366ae660807f7f97686e","./storage/gists/b2437e118b4eb7670170a2da2d4d9456941e017d","./storage/gists/298c77b04eb42bff96335383ec7a06ad39977975","./storage/gists/235a97c66e2f7a7ace6c014387b3eacfd9472270","./storage/gists/cd65e025830738ada113b47e83df9ddb950e3969"],"tiles":[{"tileindex":0,"imgindex":2,"cx1":0.34927234053611755,"cx2":0.6715176701545715,"cy1":0,"cy2":1,"tx1":0.00390625,"tx2":0.3408203125,"ty1":0.005524862091988325,"ty2":0.9944751262664795},{"tileindex":1,"imgindex":4,"cx1":0,"cx2":1,"cy1":0.2741433084011078,"cy2":0.8629283308982849,"tx1":0.3447265625,"tx2":0.99609375,"ty1":0.3342541456222534,"ty2":0.6961326003074646},{"tileindex":2,"imgindex":0,"cx1":0,"cx2":1,"cy1":0.1962616890668869,"cy2":0.672897219657898,"tx1":0.3447265625,"tx2":0.99609375,"ty1":0.7016574740409851,"ty2":0.9944751262664795},{"tileindex":3,"imgindex":3,"cx1":0,"cx2":1,"cy1":0.1526479721069336,"cy2":1,"tx1":0.591796875,"tx2":0.99609375,"ty1":0.005524862091988325,"ty2":0.3287292718887329},{"tileindex":4,"imgindex":1,"cx1":0.10602910816669464,"cx2":0.8170478343963623,"cy1":0,"cy2":1,"tx1":0.3447265625,"tx2":0.587890625,"ty1":0.005524862091988325,"ty2":0.3287292718887329}]
};


// var userStream = User.toProperty({});
var collectionStream = Collection.toProperty({composition});
var compositionStream = Composition.toProperty(composition).map(composition => {composition});

// var stream = Bacon.combineTemplate({
//   // user: userStream,
//   collection: collectionStream,
//   composition: compositionStream
// });

var stream = Bacon.combineWith(collectionStream, compositionStream, _.extend);
// var stream = collectionStream;


stream.onValue((state) => {
  // console.log(JSON.stringify(state.composition));
  React.render(<UI {...state} />, document.getElementById("app"));
});
