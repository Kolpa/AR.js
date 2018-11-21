import {ArBaseControls} from '../threex/threex-arbasecontrols';
import {ArMarkerControls} from '../threex/threex-armarkercontrols';
import {Vector3, Quaternion, Matrix4, Box3} from 'three';

export class ArMultiMarkerControls extends ArBaseControls {
  constructor(arToolkitContext, object3d, parameters) {
    super(object3d);

    const _this = this;

    if (arguments.length > 3) {
      console.assert('wrong api for', ArMultiMarkerControls);
    }
    // have a parameters in argument
    this.parameters = {
      // list of controls for each subMarker
      subMarkersControls: parameters.subMarkersControls,
      // list of pose for each subMarker relative to the origin
      subMarkerPoses: parameters.subMarkerPoses,
      // change matrix mode - [modelViewMatrix, cameraTransformMatrix]
      changeMatrixMode: parameters.changeMatrixMode !== undefined ? parameters.changeMatrixMode : 'modelViewMatrix',
    };
    this.object3d.visible = false;
    // honor obsolete stuff - add a warning to use
    this.subMarkersControls = this.parameters.subMarkersControls;
    this.subMarkerPoses = this.parameters.subMarkerPoses;
    // listen to arToolkitContext event 'sourceProcessed'
    // - after we fully processed one image, aka when we know all detected poses in it
    arToolkitContext.addEventListener('sourceProcessed', function() {
      _this._onSourceProcessed();
    });
  }

  _onSourceProcessed() {
    const _this = this;
    const stats = {
      count: 0,
      position: {
        sum: new Vector3(0, 0, 0),
        average: new Vector3(0, 0, 0),
      },
      quaternion: {
        sum: new Quaternion(0, 0, 0, 0),
        average: new Quaternion(0, 0, 0, 0),
      },
      scale: {
        sum: new Vector3(0, 0, 0),
        average: new Vector3(0, 0, 0),
      },
    };
    const firstQuaternion = _this.parameters.subMarkersControls[0].object3d.quaternion;
    this.parameters.subMarkersControls.forEach(function(markerControls, markerIndex) {
      const markerObject3d = markerControls.object3d;
      // if this marker is not visible, ignore it
      if (markerObject3d.visible === false) {
        return;
      }
      // transformation matrix of this.object3d according to this sub-markers
      const matrix = markerObject3d.matrix.clone();
      const markerPose = _this.parameters.subMarkerPoses[markerIndex];
      matrix.multiply(new Matrix4().getInverse(markerPose));
      // decompose the matrix into .position, .quaternion, .scale
      const position = new Vector3();
      const quaternion = new Quaternion();
      const scale = new Vector3();
      matrix.decompose(position, quaternion, scale);
      // http://wiki.unity3d.com/index.php/Averaging_Quaternions_and_Vectors
      stats.count++;
      ArMultiMarkerControls.averageVector3(stats.position.sum, position, stats.count, stats.position.average);
      ArMultiMarkerControls.averageQuaternion(stats.quaternion.sum, quaternion, firstQuaternion, stats.count, stats.quaternion.average);
      ArMultiMarkerControls.averageVector3(stats.scale.sum, scale, stats.count, stats.scale.average);
    });
    // honor _this.object3d.visible
    if (stats.count > 0) {
      _this.object3d.visible = true;
    } else {
      _this.object3d.visible = false;
    }
    // if at least one sub-marker has been detected, make the average of all detected markers
    if (stats.count > 0) {
      // compute modelViewMatrix
      const modelViewMatrix = new Matrix4();
      modelViewMatrix.compose(stats.position.average, stats.quaternion.average, stats.scale.average);
      // change _this.object3d.matrix based on parameters.changeMatrixMode
      if (this.parameters.changeMatrixMode === 'modelViewMatrix') {
        _this.object3d.matrix.copy(modelViewMatrix);
      } else if (this.parameters.changeMatrixMode === 'cameraTransformMatrix') {
        _this.object3d.matrix.getInverse(modelViewMatrix);
      } else {
        console.assert(false);
      }
      // decompose - the matrix into .position, .quaternion, .scale
      _this.object3d.matrix.decompose(_this.object3d.position, _this.object3d.quaternion, _this.object3d.scale);
    }
  }

  updateSmoothedControls(smoothedControls, lerpsValues) {
    // handle default values
    if (lerpsValues === undefined) {
      // FIXME this parameter format is uselessly cryptic
      // lerpValues = [
      // {lerpPosition: 0.5, lerpQuaternion: 0.2, lerpQuaternion: 0.7}
      // ]
      lerpsValues = [
        [0.3 + .1, 0.1, 0.3],
        [0.4 + .1, 0.1, 0.4],
        [0.4 + .1, 0.2, 0.5],
        [0.5 + .1, 0.2, 0.7],
        [0.5 + .1, 0.2, 0.7],
      ];
    }
    // count how many subMarkersControls are visible
    let nVisible = 0;
    this.parameters.subMarkersControls.forEach(function(markerControls, markerIndex) {
      const markerObject3d = markerControls.object3d;
      if (markerObject3d.visible === true) {
        nVisible++;
      }
    });
    // find the good lerpValues
    if (lerpsValues[nVisible - 1] !== undefined) {
      lerpValues = lerpsValues[nVisible - 1];
    } else {
      lerpValues = lerpsValues[lerpsValues.length - 1];
    }
    // modify lerpValues in smoothedControls
    smoothedControls.parameters.lerpPosition = lerpValues[0];
    smoothedControls.parameters.lerpQuaternion = lerpValues[1];
    smoothedControls.parameters.lerpScale = lerpValues[2];
  }

  static averageQuaternion(quaternionSum, newQuaternion, firstQuaternion, count, quaternionAverage) {
    quaternionAverage = quaternionAverage || new Quaternion();
    // sanity check
    console.assert(firstQuaternion instanceof Quaternion === true);
    // from http://wiki.unity3d.com/index.php/Averaging_Quaternions_and_Vectors
    if (newQuaternion.dot(firstQuaternion) > 0) {
      newQuaternion = new Quaternion(-newQuaternion.x, -newQuaternion.y, -newQuaternion.z, -newQuaternion.w);
    }
    quaternionSum.x += newQuaternion.x;
    quaternionSum.y += newQuaternion.y;
    quaternionSum.z += newQuaternion.z;
    quaternionSum.w += newQuaternion.w;
    quaternionAverage.x = quaternionSum.x / count;
    quaternionAverage.y = quaternionSum.y / count;
    quaternionAverage.z = quaternionSum.z / count;
    quaternionAverage.w = quaternionSum.w / count;
    quaternionAverage.normalize();
    return quaternionAverage;
  }

  static averageVector3(vector3Sum, vector3, count, vector3Average) {
    vector3Average = vector3Average || new Vector3();
    vector3Sum.x += vector3.x;
    vector3Sum.y += vector3.y;
    vector3Sum.z += vector3.z;
    vector3Average.x = vector3Sum.x / count;
    vector3Average.y = vector3Sum.y / count;
    vector3Average.z = vector3Sum.z / count;
    return vector3Average;
  }

  static computeCenter(jsonData) {
    const multiMarkerFile = JSON.parse(jsonData);
    const stats = {
      count: 0,
      position: {
        sum: new Vector3(0, 0, 0),
        average: new Vector3(0, 0, 0),
      },
      quaternion: {
        sum: new Quaternion(0, 0, 0, 0),
        average: new Quaternion(0, 0, 0, 0),
      },
      scale: {
        sum: new Vector3(0, 0, 0),
        average: new Vector3(0, 0, 0),
      },
    };
    const firstQuaternion = new Quaternion(); // FIXME ???
    multiMarkerFile.subMarkersControls.forEach(function(item) {
      const poseMatrix = new Matrix4().fromArray(item.poseMatrix);
      const position = new Vector3();
      const quaternion = new Quaternion();
      const scale = new Vector3();
      poseMatrix.decompose(position, quaternion, scale);
      // http://wiki.unity3d.com/index.php/Averaging_Quaternions_and_Vectors
      stats.count++;
      ArMultiMarkerControls.averageVector3(stats.position.sum, position, stats.count, stats.position.average);
      ArMultiMarkerControls.averageQuaternion(stats.quaternion.sum, quaternion, firstQuaternion, stats.count, stats.quaternion.average);
      ArMultiMarkerControls.averageVector3(stats.scale.sum, scale, stats.count, stats.scale.average);
    });
    const averageMatrix = new Matrix4();
    averageMatrix.compose(stats.position.average, stats.quaternion.average, stats.scale.average);
    return averageMatrix;
  }

  static computeBoundingBox(jsonData) {
    const multiMarkerFile = JSON.parse(jsonData);
    const boundingBox = new Box3();
    multiMarkerFile.subMarkersControls.forEach(function(item) {
      const poseMatrix = new Matrix4().fromArray(item.poseMatrix);
      const position = new Vector3();
      const quaternion = new Quaternion();
      const scale = new Vector3();
      poseMatrix.decompose(position, quaternion, scale);
      boundingBox.expandByPoint(position);
    });
    return boundingBox;
  }

  static fromJSON(arToolkitContext, parent3D, markerRoot, jsonData, parameters) {
    const multiMarkerFile = JSON.parse(jsonData);
    // declare variables
    const subMarkersControls = [];
    const subMarkerPoses = [];
    // handle default arguments
    parameters = parameters || {};
    // prepare the parameters
    multiMarkerFile.subMarkersControls.forEach(function(item) {
      // create a markerRoot
      const markerRoot = new Object3D();
      parent3D.add(markerRoot);
      // create markerControls for our markerRoot
      const subMarkerControls = new ArMarkerControls(arToolkitContext, markerRoot, item.parameters);

      subMarkersControls.push(subMarkerControls);
      subMarkerPoses.push(new Matrix4().fromArray(item.poseMatrix));
    });
    parameters.subMarkersControls = subMarkersControls;
    parameters.subMarkerPoses = subMarkerPoses;
    // create a new THREEx.ArMultiMarkerControls
    const multiMarkerControls = new ArMultiMarkerControls(arToolkitContext, markerRoot, parameters);
    // return it
    return multiMarkerControls;
  }
}
