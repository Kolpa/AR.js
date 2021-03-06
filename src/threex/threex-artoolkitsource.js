import {WebAR} from 'three';

export class ArToolkitSource {
  constructor(parameters) {
    const _this = this;
    this.ready = false;
    this.domElement = null;
    // handle default parameters
    this.parameters = {
      // type of source - ['webcam', 'image', 'video']
      sourceType: 'webcam',
      // url of the source - valid if sourceType = image|video
      sourceUrl: null,
      // Device id of the camera to use (optional)
      deviceId: null,
      // resolution of at which we initialize in the source image
      sourceWidth: 640,
      sourceHeight: 480,
      // resolution displayed for the source
      displayWidth: 640,
      displayHeight: 480,
    };

    setParameters(parameters);
    function setParameters(parameters) {
      if (parameters === undefined) {
        return;
      }
      for (const key in parameters) {
        if ({}.hasOwnProperty.call(parameters, key)) {
          const newValue = parameters[key];
          if (newValue === undefined) {
            console.warn('ArToolkitSource: \'' + key + '\' parameter is undefined.');
            continue;
          }
          const currentValue = _this.parameters[key];
          if (currentValue === undefined) {
            console.warn('ArToolkitSource: \'' + key + '\' is not a property of this material.');
            continue;
          }
          _this.parameters[key] = newValue;
        }
      }
    }
  }

  init(onReady, onError) {
    const _this = this;
    let domElement = null;
    if (this.parameters.sourceType === 'image') {
      domElement = this._initSourceImage(onSourceReady, onError);
    } else if (this.parameters.sourceType === 'video') {
      domElement = this._initSourceVideo(onSourceReady, onError);
    } else if (this.parameters.sourceType === 'webcam') {
      // var domElement = this._initSourceWebcamOld(onSourceReady)
      domElement = this._initSourceWebcam(onSourceReady, onError);
    } else {
      console.assert(false);
    }
    // attach
    this.domElement = domElement;
    this.domElement.style.position = 'absolute';
    this.domElement.style.top = '0px';
    this.domElement.style.left = '0px';
    this.domElement.style.zIndex = '-2';
    return this;
    function onSourceReady() {
      document.body.appendChild(_this.domElement);
      _this.ready = true;
      onReady && onReady();
    }
  }

  _initSourceImage(onReady) {
    // TODO make it static
    const domElement = document.createElement('img');
    domElement.src = this.parameters.sourceUrl;
    domElement.width = this.parameters.sourceWidth;
    domElement.height = this.parameters.sourceHeight;
    domElement.style.width = this.parameters.displayWidth + 'px';
    domElement.style.height = this.parameters.displayHeight + 'px';
    // wait until the video stream is ready
    const interval = setInterval(function() {
      if (!domElement.naturalWidth) {
        return;
      }
      onReady();
      clearInterval(interval);
    }, 1000 / 50);
    return domElement;
  }

  _initSourceVideo(onReady) {
    // TODO make it static
    const domElement = document.createElement('video');
    domElement.src = this.parameters.sourceUrl;
    domElement.style.objectFit = 'initial';
    domElement.autoplay = true;
    domElement.webkitPlaysinline = true;
    domElement.controls = false;
    domElement.loop = true;
    domElement.muted = true;
    // trick to trigger the video on android
    document.body.addEventListener('click', function onClick() {
      document.body.removeEventListener('click', onClick);
      domElement.play();
    });
    domElement.width = this.parameters.sourceWidth;
    domElement.height = this.parameters.sourceHeight;
    domElement.style.width = this.parameters.displayWidth + 'px';
    domElement.style.height = this.parameters.displayHeight + 'px';
    // wait until the video stream is ready
    const interval = setInterval(function() {
      if (!domElement.videoWidth) {
        return;
      }
      onReady();
      clearInterval(interval);
    }, 1000 / 50);
    return domElement;
  }
  // //////////////////////////////////////////////////////////////////////////////
  //          handle webcam source
  // //////////////////////////////////////////////////////////////////////////////
  _initSourceWebcam(onReady, onError) {
    const _this = this;
    // init default value
    onError = onError || function(error) {
      alert('Webcam Error\nName: ' + error.name + '\nMessage: ' + error.message);
    };
    const domElement = document.createElement('video');
    domElement.setAttribute('autoplay', '');
    domElement.setAttribute('muted', '');
    domElement.setAttribute('playsinline', '');
    domElement.style.width = this.parameters.displayWidth + 'px';
    domElement.style.height = this.parameters.displayHeight + 'px';
    // check API is available
    if (navigator.mediaDevices === undefined
            || navigator.mediaDevices.enumerateDevices === undefined
            || navigator.mediaDevices.getUserMedia === undefined) {
      if (navigator.mediaDevices === undefined) {
        fctName = 'navigator.mediaDevices';
      } else if (navigator.mediaDevices.enumerateDevices === undefined) {
        fctName = 'navigator.mediaDevices.enumerateDevices';
      } else if (navigator.mediaDevices.getUserMedia === undefined) {
        fctName = 'navigator.mediaDevices.getUserMedia';
      } else {
        console.assert(false);
      }
      onError({
        name: '',
        message: 'WebRTC issue-! ' + fctName + ' not present in your browser',
      });
      return null;
    }
    // get available devices
    navigator.mediaDevices.enumerateDevices().then(function(devices) {
      const userMediaConstraints = {
        audio: false,
        video: {
          facingMode: 'environment',
          width: {
            ideal: _this.parameters.sourceWidth,
          },
          height: {
            ideal: _this.parameters.sourceHeight,
          },
        },
      };
      if (null !== _this.parameters.deviceId) {
        userMediaConstraints.video.deviceId = {
          exact: _this.parameters.deviceId,
        };
      }
      // get a device which satisfy the constraints
      navigator.mediaDevices.getUserMedia(userMediaConstraints).then(function success(stream) {
        // set the .src of the domElement
        domElement.srcObject = stream;
        // to start the video, when it is possible to start it only on userevent. like in android
        document.body.addEventListener('click', function() {
          domElement.play();
        });
        // domElement.play();
        // TODO listen to loadedmetadata instead
        // wait until the video stream is ready
        const interval = setInterval(function() {
          if (!domElement.videoWidth) {
            return;
          }
          onReady();
          clearInterval(interval);
        }, 1000 / 50);
      }).catch(function(error) {
        onError({
          name: error.name,
          message: error.message,
        });
      });
    }).catch(function(error) {
      onError({
        message: error.message,
      });
    });
    return domElement;
  }

  hasMobileTorch() {
    const stream = arToolkitSource.domElement.srcObject;
    if (stream instanceof MediaStream === false) {
      return false;
    }
    if (this._currentTorchStatus === undefined) {
      this._currentTorchStatus = false;
    }
    const videoTrack = stream.getVideoTracks()[0];
    // if videoTrack.getCapabilities() doesnt exist, return false now
    if (videoTrack.getCapabilities === undefined) {
      return false;
    }
    const capabilities = videoTrack.getCapabilities();
    return capabilities.torch ? true : false;
  }

  toggleMobileTorch() {
    // sanity check
    console.assert(this.hasMobileTorch() === true);
    const stream = arToolkitSource.domElement.srcObject;
    if (stream instanceof MediaStream === false) {
      alert('enabling mobile torch is available only on webcam');
      return;
    }
    if (this._currentTorchStatus === undefined) {
      this._currentTorchStatus = false;
    }
    const videoTrack = stream.getVideoTracks()[0];
    const capabilities = videoTrack.getCapabilities();
    if (!capabilities.torch) {
      alert('no mobile torch is available on your camera');
      return;
    }
    this._currentTorchStatus = this._currentTorchStatus === false ? true : false;
    videoTrack.applyConstraints({
      advanced: [{
        torch: this._currentTorchStatus,
      }],
    }).catch(function(error) {
      console.log(error);
    });
  }
  domElementWidth() {
    return parseInt(this.domElement.style.width);
  }
  domElementHeight() {
    return parseInt(this.domElement.style.height);
  }
  // //////////////////////////////////////////////////////////////////////////////
  //          handle resize
  // //////////////////////////////////////////////////////////////////////////////
  onResizeElement() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    // sanity check
    console.assert(arguments.length === 0);
    // compute sourceWidth, sourceHeight
    let sourceWidth;
    let sourceHeight;
    if (this.domElement.nodeName === 'IMG') {
      sourceWidth = this.domElement.naturalWidth;
      sourceHeight = this.domElement.naturalHeight;
    } else if (this.domElement.nodeName === 'VIDEO') {
      sourceWidth = this.domElement.videoWidth;
      sourceHeight = this.domElement.videoHeight;
    } else {
      console.assert(false);
    }
    // compute sourceAspect
    const sourceAspect = sourceWidth / sourceHeight;
    // compute screenAspect
    const screenAspect = screenWidth / screenHeight;
    // if screenAspect < sourceAspect, then change the width, else change the height
    if (screenAspect < sourceAspect) {
      // compute newWidth and set .width/.marginLeft
      const newWidth = sourceAspect * screenHeight;
      this.domElement.style.width = newWidth + 'px';
      this.domElement.style.marginLeft = -(newWidth - screenWidth) / 2 + 'px';
      // init style.height/.marginTop to normal value
      this.domElement.style.height = screenHeight + 'px';
      this.domElement.style.marginTop = '0px';
    } else {
      // compute newHeight and set .height/.marginTop
      const newHeight = 1 / (sourceAspect / screenWidth);
      this.domElement.style.height = newHeight + 'px';
      this.domElement.style.marginTop = -(newHeight - screenHeight) / 2 + 'px';
      // init style.width/.marginLeft to normal value
      this.domElement.style.width = screenWidth + 'px';
      this.domElement.style.marginLeft = '0px';
    }
  }

  copyElementSizeTo(otherElement) {
    if (window.innerWidth > window.innerHeight) {
      // landscape
      otherElement.style.width = this.domElement.style.width;
      otherElement.style.height = this.domElement.style.height;
      otherElement.style.marginLeft = this.domElement.style.marginLeft;
      otherElement.style.marginTop = this.domElement.style.marginTop;
    } else {
      // portrait
      otherElement.style.height = this.domElement.style.height;
      otherElement.style.width = (parseInt(otherElement.style.height) * 4 / 3) + 'px';
      otherElement.style.marginLeft = ((window.innerWidth - parseInt(otherElement.style.width)) / 2) + 'px';
      otherElement.style.marginTop = 0;
    }
  }

  copySizeTo(...args) {
    console.warn('obsolete function arToolkitSource.copySizeTo. Use arToolkitSource.copyElementSizeTo');
    this.copyElementSizeTo(...args);
  }

  onResize(arToolkitContext, renderer, camera, ...args) {
    if (arguments.length !== 3) {
      console.warn('obsolete function arToolkitSource.onResize. Use arToolkitSource.onResizeElement');
      return this.onResizeElement(...args);
    }
    const trackingBackend = arToolkitContext.parameters.trackingBackend;
    // RESIZE DOMELEMENT
    if (trackingBackend === 'artoolkit') {
      this.onResizeElement();
      const isAframe = renderer.domElement.dataset.aframeCanvas ? true : false;
      if (isAframe === false) {
        this.copyElementSizeTo(renderer.domElement);
      } else {
      }
      if (arToolkitContext.arController !== null) {
        this.copyElementSizeTo(arToolkitContext.arController.canvas);
      }
    } else if (trackingBackend === 'aruco') {
      this.onResizeElement();
      this.copyElementSizeTo(renderer.domElement);
      this.copyElementSizeTo(arToolkitContext.arucoContext.canvas);
    } else if (trackingBackend === 'tango') {
      renderer.setSize(window.innerWidth, window.innerHeight);
    } else {
      console.assert(false, 'unhandled trackingBackend ' + trackingBackend);
    }
    // UPDATE CAMERA
    if (trackingBackend === 'artoolkit') {
      if (arToolkitContext.arController !== null) {
        camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
      }
    } else if (trackingBackend === 'aruco') {
      camera.aspect = renderer.domElement.width / renderer.domElement.height;
      camera.updateProjectionMatrix();
    } else {
      console.assert(false, 'unhandled trackingBackend ' + trackingBackend);
    }
  }
}
