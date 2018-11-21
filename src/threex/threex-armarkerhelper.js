import {Group, AxisHelper, CanvasTexture, MeshBasicMaterial, PlaneGeometry, Mesh} from 'three';

export class ArMarkerHelper {
  constructor(markerControls) {
    this.object3d = new Group();
    {
      const mesh = new AxisHelper();
      this.object3d.add(mesh);
    }
    const text = markerControls.id;
    // debugger
    // var text = markerControls.parameters.patternUrl.slice(-1).toUpperCase();
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    const texture = new CanvasTexture(canvas);
    // put the text in the sprite
    context.font = '48px monospace';
    context.fillStyle = 'rgba(192,192,255, 0.5)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'darkblue';
    context.fillText(text, canvas.width / 4, 3 * canvas.height / 4);
    texture.needsUpdate = true;
    // var geometry = new THREE.CubeGeometry(1, 1, 1)
    const geometry = new PlaneGeometry(1, 1);
    const material = new MeshBasicMaterial({
      map: texture,
      transparent: true,
    });
    {
      const mesh = new Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      this.object3d.add(mesh);
    }
  }
}

