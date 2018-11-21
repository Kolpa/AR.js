import {ArToolkitContext} from './threex-artoolkitcontext';
import {ArJsUtils} from '../new-api/arjs-utils';
/**
 * ArToolkitProfile helps you build parameters for artoolkit
 * - it is fully independent of the rest of the code
 * - all the other classes are still expecting normal parameters
 * - you can use this class to understand how to tune your specific usecase
 * - it is made to help people to build parameters without understanding all the underlying details.
 */
export class ArToolkitProfile {
  constructor() {
    this.reset();
    this.performance('default');
  }
  _guessPerformanceLabel() {
    const isMobile = navigator.userAgent.match(/Android/i)
            || navigator.userAgent.match(/webOS/i)
            || navigator.userAgent.match(/iPhone/i)
            || navigator.userAgent.match(/iPad/i)
            || navigator.userAgent.match(/iPod/i)
            || navigator.userAgent.match(/BlackBerry/i)
            || navigator.userAgent.match(/Windows Phone/i)
            ? true : false;
    if (isMobile === true) {
      return 'phone-normal';
    }
    return 'desktop-normal';
  }

  reset() {
    this.sourceParameters = {
      // to read from the webcam
      sourceType: 'webcam',
    };
    this.contextParameters = {
      cameraParametersUrl: ArToolkitContext.baseURL + '../data/data/camera_para.dat',
      detectionMode: 'mono',
    };
    this.defaultMarkerParameters = {
      type: 'pattern',
      patternUrl: ArToolkitContext.baseURL + '../data/data/patt.hiro',
      changeMatrixMode: 'modelViewMatrix',
    };
    return this;
  }

  performance(label) {
    if (label === 'default') {
      label = this._guessPerformanceLabel();
    }
    if (label === 'desktop-fast') {
      this.contextParameters.canvasWidth = 640 * 3;
      this.contextParameters.canvasHeight = 480 * 3;
      this.contextParameters.maxDetectionRate = 30;
    } else if (label === 'desktop-normal') {
      this.contextParameters.canvasWidth = 640;
      this.contextParameters.canvasHeight = 480;
      this.contextParameters.maxDetectionRate = 60;
    } else if (label === 'phone-normal') {
      this.contextParameters.canvasWidth = 80 * 4;
      this.contextParameters.canvasHeight = 60 * 4;
      this.contextParameters.maxDetectionRate = 30;
    } else if (label === 'phone-slow') {
      this.contextParameters.canvasWidth = 80 * 3;
      this.contextParameters.canvasHeight = 60 * 3;
      this.contextParameters.maxDetectionRate = 30;
    } else {
      console.assert(false, 'unknonwn label ' + label);
    }
    return this;
  }

  defaultMarker(trackingBackend) {
    trackingBackend = trackingBackend || this.contextParameters.trackingBackend;
    if (trackingBackend === 'artoolkit') {
      this.contextParameters.detectionMode = 'mono';
      this.defaultMarkerParameters.type = 'pattern';
      this.defaultMarkerParameters.patternUrl = ArToolkitContext.baseURL + '../data/data/patt.hiro';
    } else if (trackingBackend === 'aruco') {
      this.contextParameters.detectionMode = 'mono';
      this.defaultMarkerParameters.type = 'barcode';
      this.defaultMarkerParameters.barcodeValue = 1001;
    } else if (trackingBackend === 'tango') {
      // FIXME temporary placeholder - to reevaluate later
      this.defaultMarkerParameters.type = 'barcode';
      this.defaultMarkerParameters.barcodeValue = 1001;
    } else {
      console.assert(false);
    }
    return this;
  }

  sourceWebcam() {
    this.sourceParameters.sourceType = 'webcam';
    delete this.sourceParameters.sourceUrl;
    return this;
  }
  sourceVideo(url) {
    this.sourceParameters.sourceType = 'video';
    this.sourceParameters.sourceUrl = url;
    return this;
  }
  sourceImage(url) {
    this.sourceParameters.sourceType = 'image';
    this.sourceParameters.sourceUrl = url;
    return this;
  }

  trackingBackend(trackingBackend) {
    console.warn('stop profile.trackingBackend() obsolete function. use .trackingMethod instead');
    this.contextParameters.trackingBackend = trackingBackend;
    return this;
  }

  changeMatrixMode(changeMatrixMode) {
    this.defaultMarkerParameters.changeMatrixMode = changeMatrixMode;
    return this;
  }

  trackingMethod(trackingMethod) {
    const data = ArJsUtils.parseTrackingMethod(trackingMethod);
    this.defaultMarkerParameters.markersAreaEnabled = data.markersAreaEnabled;
    this.contextParameters.trackingBackend = data.trackingBackend;
    return this;
  }

  checkIfValid() {
    if (this.contextParameters.trackingBackend === 'tango') {
      this.sourceImage(ArToolkitContext.baseURL + '../data/images/img.jpg');
    }
    return this;
  }
}
