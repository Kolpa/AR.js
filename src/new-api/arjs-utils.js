import {Camera, PerspectiveCamera} from 'three';

export class ArJsUtils {
  static createDefaultCamera(trackingMethod) {
    const trackingBackend = this.parseTrackingMethod(trackingMethod).trackingBackend;
    // Create a camera
    if (trackingBackend === 'artoolkit') {
      camera = new Camera();
    } else if (trackingBackend === 'aruco') {
      camera = new PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.01, 100);
    } else if (trackingBackend === 'tango') {
      camera = new PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.01, 100);
    } else {
      console.assert(false, 'unknown trackingBackend: ' + trackingBackend);
    }
    return camera;
  }

  static isTango() {
    // FIXME: this test is super bad
    const isTango = navigator.userAgent.match('Chrome/57.0.2987.5') !== null ? true : false;
    return isTango;
  }

  static parseTrackingMethod(trackingMethod) {
    if (trackingMethod === 'best') {
      trackingMethod = this.isTango() ? 'tango' : 'area-artoolkit';
    }
    if (trackingMethod.startsWith('area-')) {
      return {
        trackingBackend: trackingMethod.replace('area-', ''),
        markersAreaEnabled: true,
      };
    } else {
      return {
        trackingBackend: trackingMethod,
        markersAreaEnabled: false,
      };
    }
  }
}
