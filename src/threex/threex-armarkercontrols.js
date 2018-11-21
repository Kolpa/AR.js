import {ArBaseControls} from './threex-arbasecontrols';
import {Matrix4} from 'three';

export class ArMarkerControls extends ArBaseControls {
  constructor(context, object3d, parameters) {
    super(object3d);
    const _this = this;
    this.context = context;
    // handle default parameters
    this.parameters = {
      // size of the marker in meter
      size: 1,
      // type of marker - ['pattern', 'barcode', 'unknown' ]
      type: 'unknown',
      // url of the pattern - IIF type='pattern'
      patternUrl: null,
      // value of the barcode - IIF type='barcode'
      barcodeValue: null,
      // change matrix mode - [modelViewMatrix, cameraTransformMatrix]
      changeMatrixMode: 'modelViewMatrix',
      // minimal confidence in the marke recognition - between [0, 1] - default to 1
      minConfidence: 0.6,
    };
    // sanity check
    {
      const possibleValues = ['pattern', 'barcode', 'unknown'];
      console.assert(possibleValues.indexOf(this.parameters.type) !== -1, 'illegal value', this.parameters.type);
    }
    {
      const possibleValues = ['modelViewMatrix', 'cameraTransformMatrix'];
      console.assert(possibleValues.indexOf(this.parameters.changeMatrixMode) !== -1, 'illegal value', this.parameters.changeMatrixMode);
    }
    // create the marker Root
    this.object3d = object3d;
    this.object3d.matrixAutoUpdate = false;
    this.object3d.visible = false;

    setParameters(parameters);
    function setParameters(parameters) {
      if (parameters === undefined) {
        return;
      }
      for (const key in parameters) {
        if ({}.hasOwnProperty.call(parameters, key)) {
          const newValue = parameters[key];
          if (newValue === undefined) {
            console.warn('ArMarkerControls: \'' + key + '\' parameter is undefined.');
            continue;
          }
          const currentValue = _this.parameters[key];
          if (currentValue === undefined) {
            console.warn('ArMarkerControls: \'' + key + '\' is not a property of this material.');
            continue;
          }
          _this.parameters[key] = newValue;
        }
      }
    }

    context.addMarker(this);
    if (_this.context.parameters.trackingBackend === 'artoolkit') {
      this._initArtoolkit();
    } else if (_this.context.parameters.trackingBackend === 'aruco') {
      // TODO create a ._initAruco
      // put aruco second
      this._arucoPosit = new POS.Posit(this.parameters.size, _this.context.arucoContext.canvas.width);
    } else if (_this.context.parameters.trackingBackend === 'tango') {
      this._initTango();
    } else {
      console.assert(false);
    }
  }
  dispose() {
    this.context.removeMarker(this);
    // TODO remove the event listener if needed
    // unloadMaker ???
  }

  updateWithModelViewMatrix(modelViewMatrix) {
    const markerObject3D = this.object3d;
    // mark object as visible
    markerObject3D.visible = true;
    if (this.context.parameters.trackingBackend === 'artoolkit') {
      // apply context._axisTransformMatrix - change artoolkit axis to match usual webgl one
      const tmpMatrix = new Matrix4().copy(this.context._artoolkitProjectionAxisTransformMatrix);
      tmpMatrix.multiply(modelViewMatrix);
      modelViewMatrix.copy(tmpMatrix);
    } else if (this.context.parameters.trackingBackend === 'aruco') {
      // ...
    } else if (this.context.parameters.trackingBackend === 'tango') {
      // ...
    } else {
      console.assert(false);
    }
    if (this.context.parameters.trackingBackend !== 'tango') {
      // change axis orientation on marker - artoolkit say Z is normal to the marker - ar.js say Y is normal to the marker
      const markerAxisTransformMatrix = new Matrix4().makeRotationX(Math.PI / 2);
      modelViewMatrix.multiply(markerAxisTransformMatrix);
    }
    // change markerObject3D.matrix based on parameters.changeMatrixMode
    if (this.parameters.changeMatrixMode === 'modelViewMatrix') {
      markerObject3D.matrix.copy(modelViewMatrix);
    } else if (this.parameters.changeMatrixMode === 'cameraTransformMatrix') {
      markerObject3D.matrix.getInverse(modelViewMatrix);
    } else {
      console.assert(false);
    }
    // decompose - the matrix into .position, .quaternion, .scale
    markerObject3D.matrix.decompose(markerObject3D.position, markerObject3D.quaternion, markerObject3D.scale);
    // dispatchEvent
    this.dispatchEvent({type: 'markerFound'});
  }

  name() {
    let name = '';
    name += this.parameters.type;
    if (this.parameters.type === 'pattern') {
      const url = this.parameters.patternUrl;
      const basename = url.replace(/^.*\//g, '');
      name += ' - ' + basename;
    } else if (this.parameters.type === 'barcode') {
      name += ' - ' + this.parameters.barcodeValue;
    } else {
      console.assert(false, 'no .name() implemented for this marker controls');
    }
    return name;
  }

  _initArtoolkit() {
    const _this = this;
    let artoolkitMarkerId = null;
    let delayedInitTimerId = setInterval(function() {
      // check if arController is init
      const arController = _this.context.arController;
      if (arController === null) {
        return;
      }
      // stop looping if it is init
      clearInterval(delayedInitTimerId);
      delayedInitTimerId = null;
      // launch the _postInitArtoolkit
      postInit();
    }, 1000 / 50);
    return;
    function postInit() {
      // check if arController is init
      const arController = _this.context.arController;
      console.assert(arController !== null);
      // start tracking this pattern
      if (_this.parameters.type === 'pattern') {
        arController.loadMarker(_this.parameters.patternUrl, function(markerId) {
          artoolkitMarkerId = markerId;
          arController.trackPatternMarkerId(artoolkitMarkerId, _this.parameters.size);
        });
      } else if (_this.parameters.type === 'barcode') {
        artoolkitMarkerId = _this.parameters.barcodeValue;
        arController.trackBarcodeMarkerId(artoolkitMarkerId, _this.parameters.size);
      } else if (_this.parameters.type === 'unknown') {
        artoolkitMarkerId = null;
      } else {
        console.log(false, 'invalid marker type', _this.parameters.type);
      }
      // listen to the event
      arController.addEventListener('getMarker', function(event) {
        if (event.data.type === artoolkit.PATTERN_MARKER && _this.parameters.type === 'pattern') {
          if (artoolkitMarkerId === null) {
            return;
          }
          if (event.data.marker.idPatt === artoolkitMarkerId) {
            onMarkerFound(event);
          }
        } else if (event.data.type === artoolkit.BARCODE_MARKER && _this.parameters.type === 'barcode') {
          // console.log('BARCODE_MARKER idMatrix', event.data.marker.idMatrix, artoolkitMarkerId )
          if (artoolkitMarkerId === null) {
            return;
          }
          if (event.data.marker.idMatrix === artoolkitMarkerId) {
            onMarkerFound(event);
          }
        } else if (event.data.type === artoolkit.UNKNOWN_MARKER && _this.parameters.type === 'unknown') {
          onMarkerFound(event);
        }
      });
    }
    function onMarkerFound(event) {
      // honor his.parameters.minConfidence
      if (event.data.type === artoolkit.PATTERN_MARKER && event.data.marker.cfPatt < _this.parameters.minConfidence) {
        return;
      }
      if (event.data.type === artoolkit.BARCODE_MARKER && event.data.marker.cfMatt < _this.parameters.minConfidence) {
        return;
      }
      const modelViewMatrix = new Matrix4().fromArray(event.data.matrix);
      _this.updateWithModelViewMatrix(modelViewMatrix);
    }
  }

  _initAruco() {
    this._arucoPosit = new POS.Posit(this.parameters.size, _this.context.arucoContext.canvas.width);
  }

  _initTango() {
    console.log('init tango ArMarkerControls');
  }
}
