import React from "react"
import _ from 'underscore'

import Collection from './collection'
import Composition from './composition'


var Upload = React.createClass({
  click: function(ev) {
    document.getElementById("fileinput").dispatchEvent(new MouseEvent('click'));
  },

  render: function() {
    return (
      // <div className="upload-box shadow">
      <div>
        <button className="btn btn-primary" onClick={this.click}><i className="fa fa-upload"></i>&nbsp; Upload photos</button>
        <button className="btn btn-default" onClick={Collection.reset}>Reset</button>
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

    var imgStyle = {
      height: this.percent(scaleY),
      width: this.percent(scaleX),
      top: this.percent(-tile.cy1 * scaleY),
      left: this.percent(-tile.cx1 * scaleX)
    };

    var tileStyle = {
      height: this.percent(tile.ty2 - tile.ty1),
      width: this.percent(tile.tx2 - tile.tx1),
      top: this.percent(tile.ty1),
      left: this.percent(tile.tx1)
    };

    return <div className="ui-tile" style={tileStyle}
            onMouseDown={ev => Composition.tileMouseDown(ev, tile.tileindex)}
            onMouseMove={ev => Composition.tileMouseMove(ev, tile.tileindex)}
            onMouseUp={ev => Composition.tileMouseUp(ev, tile.tileindex)}
            onMouseEnter={Composition.tileMouseEnter}>
              <img src={"/storage/photos/"+this.getFilename(this.props.composition.photos[tile.imgindex])} draggable={false} style={imgStyle} />
          </div>
  }
});


var CompositionBox = React.createClass({
  render() {
    return (
      <div className="box-mosaic">
        <div className="ui-composition shadow">
          {this.props.composition.tiles.map(tile => <Tile tile={tile} composition={this.props.composition}/> )}
        </div>
      </div>
    );
  }
});


var UI = React.createClass({
  render: function() {
    return (
      <div className="container-ui limited-width">
        <Upload />
        {_.isUndefined(this.props.composition) ? "" : <CompositionBox composition={this.props.composition} />}
      </div>
    );
  }
});


module.exports = UI
