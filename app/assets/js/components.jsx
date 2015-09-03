const React = require("react");

const collection = require('./collection');


var Upload = React.createClass({
  render: function() {
    return (
      <div>
        <button onClick={ collection.addFiles }>upload</button>
        <input type="file" name="image" multiple></input>
      </div>
    );
  }
});

var Composition = React.createClass({
  render: function() {
    return (
      <div>{ this.props.collection }</div>
    );
  }
});

var Progress = React.createClass({
  render: function() {
    return (
      <div>{ this.props.percentage }</div>
    );
  }
});

var UI = React.createClass({
  render: function() {
    return (
        <div>
      <Upload />
      <Composition collection={this.props.collection} />
      <Progress />
      </div>
    );
  }
});

module.exports = UI
