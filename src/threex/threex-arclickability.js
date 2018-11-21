import {PerspectiveCamera, Vector3, Raycaster} from 'three';
// TODO this is useless - prefere arjs-HitTesting.js
/**
 * - maybe support .onClickFcts in each object3d
 * - seems an easy light layer for clickable object
 * - up to
 */
export class ARClickability {
  constructor(sourceElement) {
    this._sourceElement = sourceElement;

    const fullWidth = parseInt(sourceElement.style.width);
    const fullHeight = parseInt(sourceElement.style.height);
    this._cameraPicking = new PerspectiveCamera(42, fullWidth / fullHeight, 0.1, 100);
    console.warn('ARClickability works only in modelViewMatrix');
    console.warn('OBSOLETE OBSOLETE! instead use HitTestingPlane or HitTestingTango');
  }
  onResize() {
    const sourceElement = this._sourceElement;
    const cameraPicking = this._cameraPicking;
    const fullWidth = parseInt(sourceElement.style.width);
    const fullHeight = parseInt(sourceElement.style.height);
    cameraPicking.aspect = fullWidth / fullHeight;
    cameraPicking.updateProjectionMatrix();
  }
  computeIntersects(domEvent, objects) {
    const sourceElement = this._sourceElement;
    const cameraPicking = this._cameraPicking;
    // compute mouse coordinatge with [-1,1]
    const eventCoords = new Vector3();
    eventCoords.x = (domEvent.layerX / parseInt(sourceElement.style.width)) * 2 - 1;
    eventCoords.y = -(domEvent.layerY / parseInt(sourceElement.style.height)) * 2 + 1;
    // compute intersections between eventCoords and pickingPlane
    const raycaster = new Raycaster();
    raycaster.setFromCamera(eventCoords, cameraPicking);
    const intersects = raycaster.intersectObjects(objects);
    return intersects;
  }
  update() {
  }
}
