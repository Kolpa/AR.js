import {ArToolkitContext} from '../threex/threex-artoolkitcontext';
import {Matrix4} from 'three';

export class ArMultiMarkerUtils {
  static navigateToLearnerPage(learnerBaseURL, trackingBackend) {
    const learnerParameters = {
      backURL: location.href,
      trackingBackend: trackingBackend,
      markersControlsParameters: ArMultiMarkerUtils.createDefaultMarkersControlsParameters(trackingBackend),
    };
    location.href = learnerBaseURL + '?' + encodeURIComponent(JSON.stringify(learnerParameters));
  }

  static storeDefaultMultiMarkerFile(trackingBackend) {
    const file = ArMultiMarkerUtils.createDefaultMultiMarkerFile(trackingBackend);
    // json.strinfy the value and store it in localStorage
    localStorage.setItem('ARjsMultiMarkerFile', JSON.stringify(file));
  }

  static createDefaultMultiMarkerFile(trackingBackend) {
    console.assert(trackingBackend);
    if (trackingBackend === undefined) {
      debugger;
    }
    // create absoluteBaseURL
    const link = document.createElement('a');
    link.href = ArToolkitContext.baseURL;
    const absoluteBaseURL = link.href;
    // create the base file
    const file = {
      meta: {
        createdBy: 'AR.js ' + ArToolkitContext.REVISION + ' - Default Marker',
        createdAt: new Date().toJSON(),
      },
      trackingBackend: trackingBackend,
      subMarkersControls: [
        // empty for now... being filled
      ],
    };
    // add a subMarkersControls
    file.subMarkersControls[0] = {
      parameters: {},
      poseMatrix: new Matrix4().makeTranslation(0, 0, 0).toArray(),
    };
    if (trackingBackend === 'artoolkit') {
      file.subMarkersControls[0].parameters.type = 'pattern';
      file.subMarkersControls[0].parameters.patternUrl = absoluteBaseURL + 'examples/marker-training/examples/pattern-files/pattern-hiro.patt';
    } else if (trackingBackend === 'aruco') {
      file.subMarkersControls[0].parameters.type = 'barcode';
      file.subMarkersControls[0].parameters.barcodeValue = 1001;
    } else {
      console.assert(false);
    }
    // json.strinfy the value and store it in localStorage
    return file;
  }

  static createDefaultMarkersControlsParameters(trackingBackend) {
    // create absoluteBaseURL
    const link = document.createElement('a');
    link.href = ArToolkitContext.baseURL;
    const absoluteBaseURL = link.href;
    if (trackingBackend === 'artoolkit') {
      // pattern hiro/kanji/a/b/c/f
      markersControlsParameters = [
        {
          type: 'pattern',
          patternUrl: absoluteBaseURL + 'examples/marker-training/examples/pattern-files/pattern-hiro.patt',
        },
        {
          type: 'pattern',
          patternUrl: absoluteBaseURL + 'examples/marker-training/examples/pattern-files/pattern-kanji.patt',
        },
        {
          type: 'pattern',
          patternUrl: absoluteBaseURL + 'examples/marker-training/examples/pattern-files/pattern-letterA.patt',
        },
        {
          type: 'pattern',
          patternUrl: absoluteBaseURL + 'examples/marker-training/examples/pattern-files/pattern-letterB.patt',
        },
        {
          type: 'pattern',
          patternUrl: absoluteBaseURL + 'examples/marker-training/examples/pattern-files/pattern-letterC.patt',
        },
        {
          type: 'pattern',
          patternUrl: absoluteBaseURL + 'examples/marker-training/examples/pattern-files/pattern-letterF.patt',
        },
      ];
    } else if (trackingBackend === 'aruco') {
      markersControlsParameters = [
        {
          type: 'barcode',
          barcodeValue: 1001,
        },
        {
          type: 'barcode',
          barcodeValue: 1002,
        },
        {
          type: 'barcode',
          barcodeValue: 1003,
        },
        {
          type: 'barcode',
          barcodeValue: 1004,
        },
        {
          type: 'barcode',
          barcodeValue: 1005,
        },
        {
          type: 'barcode',
          barcodeValue: 1006,
        },
      ];
    } else {
      console.assert(false);
    }
    return markersControlsParameters;
  }

  static storeMarkersAreaFileFromResolution(trackingBackend, resolutionW, resolutionH) {
    // generate areaFile
    const areaFile = this.buildMarkersAreaFileFromResolution(trackingBackend, resolutionW, resolutionH);
    // store areaFile in localStorage
    localStorage.setItem('ARjsMultiMarkerFile', JSON.stringify(areaFile));
  }

  static buildMarkersAreaFileFromResolution(trackingBackend, resolutionW, resolutionH) {
    // create the base file
    const file = {
      meta: {
        createdBy: 'AR.js - Augmented Website',
        createdAt: new Date().toJSON(),
      },
      trackingBackend: trackingBackend,
      subMarkersControls: [
        // empty for now...
      ],
    };
    const whiteMargin = 0.1;
    if (resolutionW > resolutionH) {
      markerImageSize = 0.4 * resolutionH;
    } else if (resolutionW < resolutionH) {
      markerImageSize = 0.4 * resolutionW;
    } else if (resolutionW === resolutionH) {
      // specific for twitter player - https://dev.twitter.com/cards/types/player
      markerImageSize = 0.33 * resolutionW;
    } else {
      console.assert(false);
    }
    // console.warn('using new markerImageSize computation')
    const actualMarkerSize = markerImageSize * (1 - 2 * whiteMargin);
    const deltaX = (resolutionW - markerImageSize) / 2 / actualMarkerSize;
    const deltaZ = (resolutionH - markerImageSize) / 2 / actualMarkerSize;
    subMarkerControls = buildSubMarkerControls('center', 0, 0);
    file.subMarkersControls.push(subMarkerControls);
    subMarkerControls = buildSubMarkerControls('topleft', -deltaX, -deltaZ);
    file.subMarkersControls.push(subMarkerControls);
    subMarkerControls = buildSubMarkerControls('topright', +deltaX, -deltaZ);
    file.subMarkersControls.push(subMarkerControls);
    subMarkerControls = buildSubMarkerControls('bottomleft', -deltaX, +deltaZ);
    file.subMarkersControls.push(subMarkerControls);
    subMarkerControls = buildSubMarkerControls('bottomright', +deltaX, +deltaZ);
    file.subMarkersControls.push(subMarkerControls);
    return file;

    function buildSubMarkerControls(layout, positionX, positionZ) {
      console.log('buildSubMarkerControls', layout, positionX, positionZ);
      // create subMarkersControls
      const subMarkersControls = {
        parameters: {},
        poseMatrix: new Matrix4().makeTranslation(positionX, 0, positionZ).toArray(),
      };
      // fill the parameters
      if (trackingBackend === 'artoolkit') {
        layout2MarkerParametersArtoolkit(subMarkersControls.parameters, layout);
      } else if (trackingBackend === 'aruco') {
        layout2MarkerParametersAruco(subMarkersControls.parameters, layout);
      } else {
        console.assert(false);
      }
      // return subMarkersControls
      return subMarkersControls;
    }

    function layout2MarkerParametersArtoolkit(parameters, layout) {
      // create absoluteBaseURL
      const link = document.createElement('a');
      link.href = ArToolkitContext.baseURL;
      const absoluteBaseURL = link.href;
      const layout2PatternUrl = {
        'center': convertRelativeUrlToAbsolute(absoluteBaseURL + 'examples/marker-training/examples/pattern-files/pattern-hiro.patt'),
        'topleft': convertRelativeUrlToAbsolute(absoluteBaseURL + 'examples/marker-training/examples/pattern-files/pattern-letterA.patt'),
        'topright': convertRelativeUrlToAbsolute(absoluteBaseURL + 'examples/marker-training/examples/pattern-files/pattern-letterB.patt'),
        'bottomleft': convertRelativeUrlToAbsolute(absoluteBaseURL + 'examples/marker-training/examples/pattern-files/pattern-letterC.patt'),
        'bottomright': convertRelativeUrlToAbsolute(absoluteBaseURL + 'examples/marker-training/examples/pattern-files/pattern-letterF.patt'),
      };
      console.assert(layout2PatternUrl[layout] !== undefined);
      parameters.type = 'pattern';
      parameters.patternUrl = layout2PatternUrl[layout];
      return;
      function convertRelativeUrlToAbsolute(relativeUrl) {
        const tmpLink = document.createElement('a');
        tmpLink.href = relativeUrl;
        return tmpLink.href;
      }
    }

    function layout2MarkerParametersAruco(parameters, layout) {
      const layout2Barcode = {
        'center': 1001,
        'topleft': 1002,
        'topright': 1003,
        'bottomleft': 1004,
        'bottomright': 1005,
      };
      console.assert(layout2Barcode[layout]);
      parameters.type = 'barcode';
      parameters.barcodeValue = layout2Barcode[layout];
    }
  }
}
