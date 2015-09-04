const React = require("react");

const Collection = require('./collection');


var Upload = React.createClass({
  click: function(ev) {
    document.getElementById("fileinput").dispatchEvent(new Event('click'));
  },

  render: function() {
    return (
      <div>
        <button onClick={this.click}>upload</button>
        <input type="file" name="image" onChange={Collection.addFiles} id="fileinput" multiple></input>
      </div>
    );
  }
});


var Tile = React.createClass({
  percent(x) { return x * 100 + "%"; },
  getFilename(path) { return path.split('/').pop() },
  render() {
    var tile = this.props.tile;
    var scaleX = 1 / (tile.cx2 - tile.cx1);
    var scaleY = 1 / (tile.cy2 - tile.cy1);

    return <img
      src={"/storage/photos/"+this.getFilename(this.props.comp.photos[tile.imgindex])}
      draggable={false}
      style={{
        height: this.percent(scaleY),
        width: this.percent(scaleX),
        top: this.percent(-tile.cy1 * scaleY),
        left: this.percent(-tile.cx1 * scaleX)
      }} />
  }
});


var Composition = React.createClass({
  percent(x) { return x * 100 + "%"; },
  render() {
    return (
      <div className="ui-composition shadow">
        {this.props.composition.tiles.map(tile => {
          return <div className="ui-tile" style={{
              height: this.percent(tile.ty2 - tile.ty1),
              width: this.percent(tile.tx2 - tile.tx1),
              top: this.percent(tile.ty1),
              left: this.percent(tile.tx1)
          }}>
              <Tile tile={tile} comp={this.props.composition} />
            </div>
        })}
      </div>
    );
  }
});


var UI = React.createClass({
  render: function() {
    return (
      <div className="container-ui">
        <Upload />
        <div className="box-mosaic">
          <Composition composition={this.props.composition} />
        </div>
      </div>
    );
  }
});


module.exports = UI
