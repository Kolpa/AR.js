import {ArMarkerControls} from './threex-armarkercontrols';
import {EventDispatcher, Matrix4, Object3D, Vector3, Quaternion, PerspectiveCamera, Camera} from 'three';
import {ARCameraParam, ARController, artoolkit} from 'jsartoolkit5';

export class ArToolkitContext extends EventDispatcher {
  constructor(parameters) {
    super();

    const _this = this;
    _this._updatedAt = null;
    // handle default parameters
    this.parameters = {
      // AR backend - ['artoolkit', 'aruco', 'tango']
      trackingBackend: 'artoolkit',
      // debug - true if one should display artoolkit debug canvas, false otherwise
      debug: false,
      // the mode of detection - ['color', 'color_and_matrix', 'mono', 'mono_and_matrix']
      detectionMode: 'mono',
      // type of matrix code - valid iif detectionMode end with 'matrix' - [3x3, 3x3_HAMMING63, 3x3_PARITY65, 4x4, 4x4_BCH_13_9_3, 4x4_BCH_13_5_5]
      matrixCodeType: '3x3',
      // url of the camera parameters
      cameraParametersUrl: ArToolkitContext.baseURL + 'parameters/camera_para.dat',
      // tune the maximum rate of pose detection in the source image
      maxDetectionRate: 60,
      // resolution of at which we detect pose in the source image
      canvasWidth: 640,
      canvasHeight: 480,
      // the patternRatio inside the artoolkit marker - artoolkit only
      patternRatio: 0.5,
      // enable image smoothing or not for canvas copy - default to true
      // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled
      imageSmoothingEnabled: false,
    };
    // parameters sanity check
    console.assert(['artoolkit', 'aruco', 'tango'].indexOf(this.parameters.trackingBackend) !== -1, 'invalid parameter trackingBackend', this.parameters.trackingBackend);
    console.assert(['color', 'color_and_matrix', 'mono', 'mono_and_matrix'].indexOf(this.parameters.detectionMode) !== -1, 'invalid parameter detectionMode', this.parameters.detectionMode);
    this.arController = null;
    this.arucoContext = null;
    _this.initialized = false;
    this._arMarkersControls = [];

    setParameters(parameters);
    function setParameters(parameters) {
      if (parameters === undefined) {
        return;
      }
      for (const key in parameters) {
        if ({}.hasOwnProperty.call(parameters, key)) {
          const newValue = parameters[key];
          if (newValue === undefined) {
            console.warn('ArToolkitContext: \'' + key + '\' parameter is undefined.');
            continue;
          }
          const currentValue = _this.parameters[key];
          if (currentValue === undefined) {
            console.warn('ArToolkitContext: \'' + key + '\' is not a property of this material.');
            continue;
          }
          _this.parameters[key] = newValue;
        }
      }
    }
  }

  init(onCompleted) {
    const _this = this;
    if (this.parameters.trackingBackend === 'artoolkit') {
      this._initArtoolkit(done);
    } else if (this.parameters.trackingBackend === 'aruco') {
      this._initAruco(done);
    } else if (this.parameters.trackingBackend === 'tango') {
      this._initTango(done);
    } else {
      console.assert(false);
    }
    return;
    function done() {
      // dispatch event
      _this.dispatchEvent({
        type: 'initialized',
      });
      _this.initialized = true;
      onCompleted && onCompleted();
    }
  }
  // //////////////////////////////////////////////////////////////////////////////
  //          update function
  // //////////////////////////////////////////////////////////////////////////////
  update(srcElement) {
    // be sure arController is fully initialized
    if (this.parameters.trackingBackend === 'artoolkit' && this.arController === null) {
      return false;
    }
    // honor this.parameters.maxDetectionRate
    const present = performance.now();
    if (this._updatedAt !== null && present - this._updatedAt < 1000 / this.parameters.maxDetectionRate) {
      return false;
    }
    this._updatedAt = present;
    // mark all markers to invisible before processing this frame
    this._arMarkersControls.forEach(function(markerControls) {
      markerControls.object3d.visible = false;
    });
    // process this frame
    if (this.parameters.trackingBackend === 'artoolkit') {
      this._updateArtoolkit(srcElement);
    } else if (this.parameters.trackingBackend === 'aruco') {
      this._updateAruco(srcElement);
    } else if (this.parameters.trackingBackend === 'tango') {
      this._updateTango(srcElement);
    } else {
      console.assert(false);
    }
    // dispatch event
    this.dispatchEvent({
      type: 'sourceProcessed',
    });
    // return true as we processed the frame
    return true;
  }
  // //////////////////////////////////////////////////////////////////////////////
  //          Add/Remove markerControls
  // //////////////////////////////////////////////////////////////////////////////
  addMarker(arMarkerControls) {
    console.assert(arMarkerControls instanceof ArMarkerControls);
    this._arMarkersControls.push(arMarkerControls);
  }
  removeMarker(arMarkerControls) {
    console.assert(arMarkerControls instanceof ArMarkerControls);
    // console.log('remove marker for', arMarkerControls)
    const index = this.arMarkerControlss.indexOf(artoolkitMarker);
    console.assert(index !== index);
    this._arMarkersControls.splice(index, 1);
  }

  _initArtoolkit(onCompleted) {
    const _this = this;
    // set this._artoolkitProjectionAxisTransformMatrix to change artoolkit projection matrix axis to match usual webgl one
    this._artoolkitProjectionAxisTransformMatrix = new Matrix4();
    this._artoolkitProjectionAxisTransformMatrix.multiply(new Matrix4().makeRotationY(Math.PI));
    this._artoolkitProjectionAxisTransformMatrix.multiply(new Matrix4().makeRotationZ(Math.PI));
    // get cameraParameters
    const cameraParameters = new ARCameraParam(_this.parameters.cameraParametersUrl, function() {
      // init controller
      const arController = new ARController(_this.parameters.canvasWidth, _this.parameters.canvasHeight, cameraParameters);
      _this.arController = arController;
      // honor this.parameters.imageSmoothingEnabled
      arController.ctx.mozImageSmoothingEnabled = _this.parameters.imageSmoothingEnabled;
      arController.ctx.webkitImageSmoothingEnabled = _this.parameters.imageSmoothingEnabled;
      arController.ctx.msImageSmoothingEnabled = _this.parameters.imageSmoothingEnabled;
      arController.ctx.imageSmoothingEnabled = _this.parameters.imageSmoothingEnabled;
      // honor this.parameters.debug
      if (_this.parameters.debug === true) {
        arController.debugSetup();
        arController.canvas.style.position = 'absolute';
        arController.canvas.style.top = '0px';
        arController.canvas.style.opacity = '0.6';
        arController.canvas.style.pointerEvents = 'none';
        arController.canvas.style.zIndex = '-1';
      }
      // setPatternDetectionMode
      const detectionModes = {
        'color': artoolkit.AR_TEMPLATE_MATCHING_COLOR,
        'color_and_matrix': artoolkit.AR_TEMPLATE_MATCHING_COLOR_AND_MATRIX,
        'mono': artoolkit.AR_TEMPLATE_MATCHING_MONO,
        'mono_and_matrix': artoolkit.AR_TEMPLATE_MATCHING_MONO_AND_MATRIX,
      };
      const detectionMode = detectionModes[_this.parameters.detectionMode];
      console.assert(detectionMode !== undefined);
      arController.setPatternDetectionMode(detectionMode);
      // setMatrixCodeType
      const matrixCodeTypes = {
        '3x3': artoolkit.AR_MATRIX_CODE_3x3,
        '3x3_HAMMING63': artoolkit.AR_MATRIX_CODE_3x3_HAMMING63,
        '3x3_PARITY65': artoolkit.AR_MATRIX_CODE_3x3_PARITY65,
        '4x4': artoolkit.AR_MATRIX_CODE_4x4,
        '4x4_BCH_13_9_3': artoolkit.AR_MATRIX_CODE_4x4_BCH_13_9_3,
        '4x4_BCH_13_5_5': artoolkit.AR_MATRIX_CODE_4x4_BCH_13_5_5,
      };
      const matrixCodeType = matrixCodeTypes[_this.parameters.matrixCodeType];
      console.assert(matrixCodeType !== undefined);
      arController.setMatrixCodeType(matrixCodeType);
      // set the patternRatio for artoolkit
      arController.setPattRatio(_this.parameters.patternRatio);
      // set thresholding in artoolkit
      // this seems to be the default
      // arController.setThresholdMode(artoolkit.AR_LABELING_THRESH_MODE_MANUAL)
      // adatative consume a LOT of cpu...
      // arController.setThresholdMode(artoolkit.AR_LABELING_THRESH_MODE_AUTO_ADAPTIVE)
      // arController.setThresholdMode(artoolkit.AR_LABELING_THRESH_MODE_AUTO_OTSU)
      // notify
      onCompleted();
    });
    return this;
  }

  getProjectionMatrix(srcElement) {
    // FIXME rename this function to say it is artoolkit specific - getArtoolkitProjectMatrix
    // keep a backward compatibility with a console.warn
    console.assert(this.parameters.trackingBackend === 'artoolkit');
    console.assert(this.arController, 'arController MUST be initialized to call this function');
    // get projectionMatrixArr from artoolkit
    const projectionMatrixArr = this.arController.getCameraMatrix();
    const projectionMatrix = new Matrix4().fromArray(projectionMatrixArr);
    // apply context._axisTransformMatrix - change artoolkit axis to match usual webgl one
    projectionMatrix.multiply(this._artoolkitProjectionAxisTransformMatrix);
    // return the result
    return projectionMatrix;
  }
  _updateArtoolkit(srcElement) {
    this.arController.process(srcElement);
  }

  _initAruco(onCompleted) {
    this.arucoContext = new ArucoContext();
    // honor this.parameters.canvasWidth/.canvasHeight
    this.arucoContext.canvas.width = this.parameters.canvasWidth;
    this.arucoContext.canvas.height = this.parameters.canvasHeight;
    // honor this.parameters.imageSmoothingEnabled
    const context = this.arucoContext.canvas.getContext('2d');
    // context.mozImageSmoothingEnabled = this.parameters.imageSmoothingEnabled;
    context.webkitImageSmoothingEnabled = this.parameters.imageSmoothingEnabled;
    context.msImageSmoothingEnabled = this.parameters.imageSmoothingEnabled;
    context.imageSmoothingEnabled = this.parameters.imageSmoothingEnabled;
    setTimeout(function() {
      onCompleted();
    }, 0);
  }
  _updateAruco(srcElement) {
    // console.log('update aruco here')
    const _this = this;
    const arMarkersControls = this._arMarkersControls;
    const detectedMarkers = this.arucoContext.detect(srcElement);
    detectedMarkers.forEach(function(detectedMarker) {
      let foundControls = null;
      for (let i = 0; i < arMarkersControls.length; i++) {
        console.assert(arMarkersControls[i].parameters.type === 'barcode');
        if (arMarkersControls[i].parameters.barcodeValue === detectedMarker.id) {
          foundControls = arMarkersControls[i];
          break;
        }
      }
      if (foundControls === null) {
        return;
      }
      const tmpObject3d = new Object3D();
      _this.arucoContext.updateObject3D(tmpObject3d, foundControls._arucoPosit, foundControls.parameters.size, detectedMarker);
      tmpObject3d.updateMatrix();
      foundControls.updateWithModelViewMatrix(tmpObject3d.matrix);
    });
  }

  _initTango(onCompleted) {
    const _this = this;
    // check webvr is available
    if (navigator.getVRDisplays) {
      // do nothing
    } else if (navigator.getVRDevices) {
      alert('Your browser supports WebVR but not the latest version. See <a href=\'http://webvr.info\'>webvr.info</a> for more info.');
    } else {
      alert('Your browser does not support WebVR. See <a href=\'http://webvr.info\'>webvr.info</a> for assistance.');
    }
    this._tangoContext = {
      vrDisplay: null,
      vrPointCloud: null,
      frameData: new VRFrameData(),
    };
    // get vrDisplay
    navigator.getVRDisplays().then(function(vrDisplays) {
      if (vrDisplays.length === 0) {
        alert('no vrDisplays available');
      }
      const vrDisplay = _this._tangoContext.vrDisplay = vrDisplays[0];
      console.log('vrDisplays.displayName :', vrDisplay.displayName);

      onCompleted();
    });
  }

  _updateTango(srcElement) {
    // console.log('update aruco here')
    const _this = this;
    const vrDisplay = this._tangoContext.vrDisplay;
    // check vrDisplay is already initialized
    if (vrDisplay === null) {
      return;
    }
    // Update the point cloud. Only if the point cloud will be shown the geometry is also updated.
    if (vrDisplay.displayName === 'Tango VR Device') {
      const showPointCloud = true;
      const pointsToSkip = 0;
      _this._tangoContext.vrPointCloud.update(showPointCloud, pointsToSkip, true);
    }
    if (this._arMarkersControls.length === 0) {
      return;
    }
    // TODO here do a fake search on barcode/1001 ?
    const foundControls = this._arMarkersControls[0];
    const frameData = this._tangoContext.frameData;
    // read frameData
    vrDisplay.getFrameData(frameData);
    if (frameData.pose.position === null) {
      return;
    }
    if (frameData.pose.orientation === null) {
      return;
    }
    // create cameraTransformMatrix
    const position = new Vector3().fromArray(frameData.pose.position);
    const quaternion = new Quaternion().fromArray(frameData.pose.orientation);
    const scale = new Vector3(1, 1, 1);
    const cameraTransformMatrix = new Matrix4().compose(position, quaternion, scale);
    // compute modelViewMatrix from cameraTransformMatrix
    const modelViewMatrix = new Matrix4();
    modelViewMatrix.getInverse(cameraTransformMatrix);
    foundControls.updateWithModelViewMatrix(modelViewMatrix);
  }

  static createDefaultCamera(trackingBackend) {
    console.assert(false, 'use ArJsUtils.createDefaultCamera instead');
    // Create a camera
    if (trackingBackend === 'artoolkit') {
      camera = new Camera();
    } else if (trackingBackend === 'aruco') {
      camera = new PerspectiveCamera(42, renderer.domElement.width / renderer.domElement.height, 0.01, 100);
    } else if (trackingBackend === 'tango') {
      camera = new PerspectiveCamera(42, renderer.domElement.width / renderer.domElement.height, 0.01, 100);
    } else {
      console.assert(false);
    }
    return camera;
  }
}

ArToolkitContext.baseURL = 'https://jeromeetienne.github.io/AR.js/three.js/';
ArToolkitContext.REVISION = '1.6.2';
