import {Vector3, Quaternion, Matrix4} from 'three';
import {ArMultiMarkerControls} from './threex-armultimarkercontrols';
export class ArMultiMakersLearning {
  constructor(arToolkitContext, subMarkersControls) {
    const _this = this;
    this._arToolkitContext = arToolkitContext;
    this.subMarkersControls = subMarkersControls;
    this.enabled = true;

    arToolkitContext.addEventListener('sourceProcessed', function() {
      _this._onSourceProcessed();
    });
  }
  /**
     * What to do when a image source is fully processed
     */
  _onSourceProcessed() {
    const originQuaternion = this.subMarkersControls[0].object3d.quaternion;
    // here collect the statistic on relative positioning
    // honor this.enabled
    if (this.enabled === false) {
      return;
    }
    // keep only the visible markers
    const visibleMarkerControls = this.subMarkersControls.filter(function(markerControls) {
      return markerControls.object3d.visible === true;
    });
    const count = Object.keys(visibleMarkerControls).length;
    const positionDelta = new Vector3();
    const quaternionDelta = new Quaternion();
    const scaleDelta = new Vector3();
    const tmpMatrix = new Matrix4();
    // go thru all the visibleMarkerControls
    for (let i = 0; i < count; i++) {
      const markerControls1 = visibleMarkerControls[i];
      for (let j = 0; j < count; j++) {
        const markerControls2 = visibleMarkerControls[j];
        // if markerControls1 is markerControls2, then skip it
        if (i === j) {
          continue;
        }
        // create seenCouples for markerControls1 if needed
        if (markerControls1.object3d.userData.seenCouples === undefined) {
          markerControls1.object3d.userData.seenCouples = {};
        }
        const seenCouples = markerControls1.object3d.userData.seenCouples;
        // create the multiMarkerPosition average if needed`
        if (seenCouples[markerControls2.id] === undefined) {
          // console.log('create seenCouples between', markerControls1.id, 'and', markerControls2.id)
          seenCouples[markerControls2.id] = {
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
        }
        tmpMatrix.getInverse(markerControls1.object3d.matrix);
        tmpMatrix.multiply(markerControls2.object3d.matrix);
        tmpMatrix.decompose(positionDelta, quaternionDelta, scaleDelta);

        const stats = seenCouples[markerControls2.id];
        // update the count
        stats.count++;
        // update the average of position/rotation/scale
        ArMultiMarkerControls.averageVector3(stats.position.sum, positionDelta, stats.count, stats.position.average);
        ArMultiMarkerControls.averageQuaternion(stats.quaternion.sum, quaternionDelta, originQuaternion, stats.count, stats.quaternion.average);
        ArMultiMarkerControls.averageVector3(stats.scale.sum, scaleDelta, stats.count, stats.scale.average);
      }
    }
  }

  computeResult() {
    const _this = this;
    const originSubControls = this.subMarkersControls[0];
    this.deleteResult();
    // special case of originSubControls averageMatrix
    originSubControls.object3d.userData.result = {
      averageMatrix: new Matrix4(),
      confidenceFactor: 1,
    };
    // TODO here check if the originSubControls has been seen at least once!!
    /**
         * ALGO in pseudo code
         *
         * - Set confidenceFactor of origin sub markers as 1
         *
         * Start Looping
         * - For a given sub marker, skip it if it already has a result.
         * - if no result, check all seen couple and find n ones which has a progress of 1 or more.
         * - So the other seen sub markers, got a valid transformation matrix.
         * - So take local averages position/orientation/scale, compose a transformation matrix.
         *   - aka transformation matrix from parent matrix * transf matrix pos/orientation/scale
         * - Multiple it by the other seen marker matrix.
         * - Loop on the array until one pass could not compute any new sub marker
         */
    do {
      resultChanged = false;
      // loop over each subMarkerControls
      this.subMarkersControls.forEach(function(subMarkerControls) {
        // if subMarkerControls already has a result, do nothing
        const result = subMarkerControls.object3d.userData.result;
        const isLearned = (result !== undefined && result.confidenceFactor >= 1) ? true : false;
        if (isLearned === true) {
          return;
        }
        // console.log('compute subMarkerControls', subMarkerControls.name())
        const otherSubControlsID = _this._getLearnedCoupleStats(subMarkerControls);
        if (otherSubControlsID === null) {
          // console.log('no learnedCoupleStats')
          return;
        }
        const otherSubControls = _this._getSubMarkerControlsByID(otherSubControlsID);
        const seenCoupleStats = subMarkerControls.object3d.userData.seenCouples[otherSubControlsID];
        const averageMatrix = new Matrix4();
        averageMatrix.compose(seenCoupleStats.position.average, seenCoupleStats.quaternion.average, seenCoupleStats.scale.average);
        const otherAverageMatrix = otherSubControls.object3d.userData.result.averageMatrix;
        let matrix = new Matrix4().getInverse(otherAverageMatrix).multiply(averageMatrix);
        matrix = new Matrix4().getInverse(matrix);
        console.assert(subMarkerControls.object3d.userData.result === undefined);
        subMarkerControls.object3d.userData.result = {
          averageMatrix: matrix,
          confidenceFactor: 1,
        };
        resultChanged = true;
      });
    } while (resultChanged === true);
  }

  _getLearnedCoupleStats(subMarkerControls) {
    // if this subMarkerControls has never been seen with another subMarkerControls
    if (subMarkerControls.object3d.userData.seenCouples === undefined) {
      return null;
    }
    const seenCouples = subMarkerControls.object3d.userData.seenCouples;
    const coupleControlsIDs = Object.keys(seenCouples).map(Number);
    for (let i = 0; i < coupleControlsIDs.length; i++) {
      const otherSubControlsID = coupleControlsIDs[i];
      // get otherSubControls
      const otherSubControls = this._getSubMarkerControlsByID(otherSubControlsID);
      // if otherSubControls isnt learned, skip it
      const result = otherSubControls.object3d.userData.result;
      const isLearned = (result !== undefined && result.confidenceFactor >= 1) ? true : false;
      if (isLearned === false) {
        continue;
      }
      // return this seenCouplesStats
      return otherSubControlsID;
    }
    // if none is found, return null
    return null;
  }

  _getSubMarkerControlsByID(controlsID) {
    for (let i = 0; i < this.subMarkersControls.length; i++) {
      const subMarkerControls = this.subMarkersControls[i];
      if (subMarkerControls.id === controlsID) {
        return subMarkerControls;
      }
    }
    return null;
  }

  toJSON() {
    // compute the average matrix before generating the file
    this.computeResult();
    const data = {
      meta: {
        createdBy: 'Area Learning - AR.js ' + THREEx.ArToolkitContext.REVISION,
        createdAt: new Date().toJSON(),
      },
      trackingBackend: this._arToolkitContext.parameters.trackingBackend,
      subMarkersControls: [],
    };
    const originSubControls = this.subMarkersControls[0];
    const originMatrixInverse = new Matrix4().getInverse(originSubControls.object3d.matrix);
    this.subMarkersControls.forEach(function(subMarkerControls, index) {
      // if a subMarkerControls has no result, ignore it
      if (subMarkerControls.object3d.userData.result === undefined) {
        return;
      }
      const poseMatrix = subMarkerControls.object3d.userData.result.averageMatrix;
      console.assert(poseMatrix instanceof Matrix4);
      // build the info
      const info = {
        parameters: {
          // to fill ...
        },
        poseMatrix: poseMatrix.toArray(),
      };
      if (subMarkerControls.parameters.type === 'pattern') {
        info.parameters.type = subMarkerControls.parameters.type;
        info.parameters.patternUrl = subMarkerControls.parameters.patternUrl;
      } else if (subMarkerControls.parameters.type === 'barcode') {
        info.parameters.type = subMarkerControls.parameters.type;
        info.parameters.barcodeValue = subMarkerControls.parameters.barcodeValue;
      } else {
        console.assert(false);
      }
      data.subMarkersControls.push(info);
    });
    let strJSON = JSON.stringify(data, null, '\t');

    const humanReadable = false;
    if (humanReadable === true) {
      const tmp = JSON.parse(strJSON);
      tmp.subMarkersControls.forEach(function(markerControls) {
        markerControls.poseMatrix = markerControls.poseMatrix.map(function(value) {
          const roundingFactor = 100;
          return Math.round(value * roundingFactor) / roundingFactor;
        });
      });
      strJSON = JSON.stringify(tmp, null, '\t');
    }
    return strJSON;
  }

  resetStats() {
    this.deleteResult();
    this.subMarkersControls.forEach(function(markerControls) {
      delete markerControls.object3d.userData.seenCouples;
    });
  }

  deleteResult() {
    this.subMarkersControls.forEach(function(markerControls) {
      delete markerControls.object3d.userData.result;
    });
  }
}
