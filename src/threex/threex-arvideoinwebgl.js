import {PlaneGeometry, MeshBasicMaterial, Vector3, Mesh, Math} from 'three';

export class ArVideoInWebgl {
  constructor(videoTexture) {
    const geometry = new PlaneGeometry(2, 2);
    const material = new MeshBasicMaterial({
      // map : new THREE.TextureLoader().load('images/water.jpg'),
      map: videoTexture,
    });
    const seethruPlane = new Mesh(geometry, material);
    this.object3d = seethruPlane;
    // scene.add(seethruPlane);
    // arToolkitSource.domElement.style.visibility = 'hidden'
    // TODO extract the fov from the projectionMatrix
    // camera.fov = 43.1
    this.update = function(camera) {
      camera.updateMatrixWorld(true);
      // get seethruPlane position
      const position = new Vector3(-0, 0, -20); // TODO how come you got that offset on x ???
      seethruPlane.position.copy(position);
      camera.localToWorld(seethruPlane.position);
      // get seethruPlane quaternion
      camera.matrixWorld.decompose(camera.position, camera.quaternion, camera.scale);
      seethruPlane.quaternion.copy(camera.quaternion);
      // extract the fov from the projectionMatrix
      const fov = Math.radToDeg(Math.atan(1 / camera.projectionMatrix.elements[5])) * 2;
      // console.log('fov', fov)
      const elementWidth = parseFloat(arToolkitSource.domElement.style.width.replace(/px$/, ''), 10);
      const elementHeight = parseFloat(arToolkitSource.domElement.style.height.replace(/px$/, ''), 10);
      const aspect = elementWidth / elementHeight;

      // get seethruPlane height relative to fov
      seethruPlane.scale.y = Math.tan(THREE.Math.DEG2RAD * fov / 2) * position.length();
      // get seethruPlane aspect
      seethruPlane.scale.x = seethruPlane.scale.y * aspect;
    };
  }
}
