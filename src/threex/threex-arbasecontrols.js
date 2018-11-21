import {EventDispatcher} from 'three';

export class ArBaseControls extends EventDispatcher {
  constructor(object3d) {
    super();
    this.id = ArBaseControls.id++;
    this.object3d = object3d;
    this.object3d.matrixAutoUpdate = false;
    this.object3d.visible = false;
  }

  update() {
    console.assert(false, 'you need to implement your own update');
  }

  name() {
    console.assert(false, 'you need to implement your own .name()');
    return 'Not yet implemented - name()';
  }
}

ArBaseControls.id = 0;
