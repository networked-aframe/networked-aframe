/* global AFRAME, THREE */
(() => {

// var bind = require('../utils/bind');
// var registerComponent = require('../core/component').registerComponent;
// var THREE = require('../lib/three');

var trackedControlsUtils = AFRAME.utils.trackedControls;
var checkControllerPresentAndSetup = trackedControlsUtils.checkControllerPresentAndSetup;
var emitIfAxesChanged = trackedControlsUtils.emitIfAxesChanged;
var onButtonEvent = trackedControlsUtils.onButtonEvent;

var isWebXRAvailable = AFRAME.utils.device.isWebXRAvailable;

var GAMEPAD_ID_WEBXR = 'oculus-touch';
var GAMEPAD_ID_WEBVR = 'Oculus Touch';

// Prefix for Gen1 and Gen2 Oculus Touch Controllers.
var GAMEPAD_ID_PREFIX = isWebXRAvailable ? GAMEPAD_ID_WEBXR : GAMEPAD_ID_WEBVR;

// First generation model URL.
var TOUCH_CONTROLLER_MODEL_BASE_URL = 'https://cdn.aframe.io/controllers/oculus/oculus-touch-controller-';

var OCULUS_TOUCH_WEBVR = {
  left: {
    modelUrl: TOUCH_CONTROLLER_MODEL_BASE_URL + 'left.gltf',
    rayOrigin: {origin: {x: 0.008, y: -0.01, z: 0}, direction: {x: 0, y: -0.8, z: -1}},
    modelPivotOffset: new THREE.Vector3(-0.005, 0.003, -0.055),
    modelPivotRotation: new THREE.Euler(0, 0, 0)
  },
  right: {
    modelUrl: TOUCH_CONTROLLER_MODEL_BASE_URL + 'right.gltf',
    rayOrigin: {origin: {x: -0.008, y: -0.01, z: 0}, direction: {x: 0, y: -0.8, z: -1}},
    modelPivotOffset: new THREE.Vector3(0.005, 0.003, -0.055),
    modelPivotRotation: new THREE.Euler(0, 0, 0)
  }
};

var OCULUS_TOUCH_WEBXR = {
  left: {
    modelUrl: TOUCH_CONTROLLER_MODEL_BASE_URL + 'left.gltf',
    rayOrigin: {origin: {x: 0.002, y: -0.005, z: -0.03}, direction: {x: 0, y: -0.8, z: -1}},
    modelPivotOffset: new THREE.Vector3(-0.005, 0.036, -0.037),
    modelPivotRotation: new THREE.Euler(Math.PI / 4.5, 0, 0)
  },
  right: {
    modelUrl: TOUCH_CONTROLLER_MODEL_BASE_URL + 'right.gltf',
    rayOrigin: {origin: {x: -0.002, y: -0.005, z: -0.03}, direction: {x: 0, y: -0.8, z: -1}},
    modelPivotOffset: new THREE.Vector3(0.005, 0.036, -0.037),
    modelPivotRotation: new THREE.Euler(Math.PI / 4.5, 0, 0)
  }
};

var OCULUS_TOUCH_CONFIG = isWebXRAvailable ? OCULUS_TOUCH_WEBXR : OCULUS_TOUCH_WEBVR;

var CONTROLLER_DEFAULT = 'oculus-touch';
var CONTROLLER_PROPERTIES = {
  'oculus-touch': OCULUS_TOUCH_CONFIG,
  'oculus-touch-v2': {
    left: {
      modelUrl: TOUCH_CONTROLLER_MODEL_BASE_URL + 'gen2-left.gltf',
      rayOrigin: {origin: {x: -0.01, y: 0, z: -0.02}, direction: {x: 0, y: -0.5, z: -1}},
      modelPivotOffset: new THREE.Vector3(0, 0, 0),
      modelPivotRotation: new THREE.Euler(0, 0, 0)
    },
    right: {
      modelUrl: TOUCH_CONTROLLER_MODEL_BASE_URL + 'gen2-right.gltf',
      rayOrigin: {origin: {x: 0.01, y: 0, z: -0.02}, direction: {x: 0, y: -0.5, z: -1}},
      modelPivotOffset: new THREE.Vector3(0, 0, 0),
      modelPivotRotation: new THREE.Euler(0, 0, 0)
    }
  },
  'oculus-touch-v3': {
    left: {
      modelUrl: TOUCH_CONTROLLER_MODEL_BASE_URL + 'v3-left.glb',
      rayOrigin: {origin: {x: 0.015, y: 0.005, z: 0}, direction: {x: 0, y: 0, z: -1}},
      modelPivotOffset: new THREE.Vector3(0.01, -0.01, 0.05),
      modelPivotRotation: new THREE.Euler(Math.PI / 4, 0, 0)
    },
    right: {
      modelUrl: TOUCH_CONTROLLER_MODEL_BASE_URL + 'v3-right.glb',
      rayOrigin: {origin: {x: -0.015, y: 0.005, z: 0}, direction: {x: 0, y: 0, z: -1}},
      modelPivotOffset: new THREE.Vector3(-0.01, -0.01, 0.05),
      modelPivotRotation: new THREE.Euler(Math.PI / 4, 0, 0)
    }
  }
};

/**
 * Button indices:
 * 0 - thumbstick (which has separate axismove / thumbstickmoved events)
 * 1 - trigger (with analog value, which goes up to 1)
 * 2 - grip (with analog value, which goes up to 1)
 * 3 - X (left) or A (right)
 * 4 - Y (left) or B (right)
 * 5 - surface (touch only)
 */
var INPUT_MAPPING_WEBVR = {
  left: {
    axes: {thumbstick: [0, 1]},
    buttons: ['thumbstick', 'trigger', 'grip', 'xbutton', 'ybutton', 'surface']
  },
  right: {
    axes: {thumbstick: [0, 1]},
    buttons: ['thumbstick', 'trigger', 'grip', 'abutton', 'bbutton', 'surface']
  }
};

/**
 * Button indices:
 * 0 - trigger
 * 1 - grip
 * 2 - none
 * 3 - thumbstick
 * 4 - X or A button
 * 5 - Y or B button
 * 6 - surface
 *
 * Axis:
 * 0 - none
 * 1 - none
 * 2 - thumbstick
 * 3 - thumbstick
 * Reference: https://github.com/immersive-web/webxr-input-profiles/blob/master/packages/registry/profiles/oculus/oculus-touch.json
 */
var INPUT_MAPPING_WEBXR = {
  left: {
    axes: {thumbstick: [2, 3]},
    buttons: ['trigger', 'grip', 'none', 'thumbstick', 'xbutton', 'ybutton', 'surface']
  },
  right: {
    axes: {thumbstick: [2, 3]},
    buttons: ['trigger', 'grip', 'none', 'thumbstick', 'abutton', 'bbutton', 'surface']
  }
};

var INPUT_MAPPING = isWebXRAvailable ? INPUT_MAPPING_WEBXR : INPUT_MAPPING_WEBVR;

/**
 * Oculus Touch controls.
 * Interface with Oculus Touch controllers and map Gamepad events to
 * controller buttons: thumbstick, trigger, grip, xbutton, ybutton, surface
 * Load a controller model and highlight the pressed buttons.
 */

AFRAME.registerComponent('meta-touch-controls', {
  schema: {
    hand: {default: 'left'},
    buttonColor: {type: 'color', default: '#999'},  // Off-white.
    buttonTouchColor: {type: 'color', default: '#8AB'},
    buttonHighlightColor: {type: 'color', default: '#2DF'},  // Light blue.
    model: {default: true},
    controllerType: {default: 'auto', oneOf: ['auto', 'oculus-touch', 'oculus-touch-v2', 'oculus-touch-v3']},
    orientationOffset: {type: 'vec3', default: {x: 43, y: 0, z: 0}}
  },

  mapping: INPUT_MAPPING,

  bindMethods: function () {
    this.onButtonChanged = this.onButtonChanged.bind(this);
    this.onThumbstickMoved = this.onThumbstickMoved.bind(this);
    
    this.onModelLoaded = this.onModelLoaded.bind(this);
    this.onControllersUpdate = this.onControllersUpdate.bind(this);
    this.checkIfControllerPresent = this.checkIfControllerPresent.bind(this);
    this.onAxisMoved = this.onAxisMoved.bind(this);
  },

  init: function () {
    var self = this;
    
    this.onButtonDown = function (evt) { onButtonEvent(evt.detail.id, 'down', self, self.data.hand); };
    this.onButtonUp = function (evt) { onButtonEvent(evt.detail.id, 'up', self, self.data.hand); };
    this.onButtonTouchStart = function (evt) { onButtonEvent(evt.detail.id, 'touchstart', self, self.data.hand); };
    this.onButtonTouchEnd = function (evt) { onButtonEvent(evt.detail.id, 'touchend', self, self.data.hand); };
    
    this.controllerPresent = false;
    this.lastControllerCheck = 0;
    this.previousButtonValues = {};
    this.rendererSystem = this.el.sceneEl.systems.renderer;
    this.bindMethods();
    this.triggerEuler = new THREE.Euler;
  },

  addEventListeners: function () {
    var el = this.el;
    // these events come from upstream, in tracked-webxr-controls, with more raw data
    el.addEventListener('buttonchanged', this.onButtonChanged);
    el.addEventListener('axismove', this.onAxisMoved);

    // this component both emits and consumes these events
    el.addEventListener('buttondown', this.onButtonDown);
    el.addEventListener('buttonup', this.onButtonUp);
    el.addEventListener('touchstart', this.onButtonTouchStart);
    el.addEventListener('touchend', this.onButtonTouchEnd);
    el.addEventListener('model-loaded', this.onModelLoaded);
    el.addEventListener('thumbstickmoved', this.onThumbstickMoved);
    this.controllerEventsActive = true;
  },

  removeEventListeners: function () {
    var el = this.el;
    el.removeEventListener('buttonchanged', this.onButtonChanged);
    el.removeEventListener('axismove', this.onAxisMoved);
    el.removeEventListener('buttondown', this.onButtonDown);
    el.removeEventListener('buttonup', this.onButtonUp);
    el.removeEventListener('touchstart', this.onButtonTouchStart);
    el.removeEventListener('touchend', this.onButtonTouchEnd);
    el.removeEventListener('model-loaded', this.onModelLoaded);
    el.removeEventListener('thumbstickmoved', this.onThumbstickMoved);
    this.controllerEventsActive = false;
  },

  checkIfControllerPresent: function () {
    checkControllerPresentAndSetup(this, GAMEPAD_ID_PREFIX, {
      hand: this.data.hand
    });
  },

  play: function () {
    this.checkIfControllerPresent();
    this.addControllersUpdateListener();
  },

  pause: function () {
    this.removeEventListeners();
    this.removeControllersUpdateListener();
  },

  loadModel: function (controller) {
    var data = this.data;
    var controllerId;

    if (!data.model) { return; }
    // Set the controller display model based on the data passed in.
    this.displayModel = CONTROLLER_PROPERTIES[data.controllerType] || CONTROLLER_PROPERTIES[CONTROLLER_DEFAULT];
    // If the developer is asking for auto-detection, see if the displayName can be retrieved to identify the specific unit.
    // This only works for WebVR currently.
    if (data.controllerType === 'auto') {
      var trackedControlsSystem = this.el.sceneEl.systems['tracked-controls-webvr'];
      // WebVR
      if (trackedControlsSystem && trackedControlsSystem.vrDisplay) {
        var displayName = trackedControlsSystem.vrDisplay.displayName;
        // The Oculus Quest uses the updated generation 2 inside-out tracked controllers so update the displayModel.
        if (/^Oculus Quest$/.test(displayName)) {
          this.displayModel = CONTROLLER_PROPERTIES['oculus-touch-v2'];
        }
      } else { // WebXR
        controllerId = CONTROLLER_DEFAULT;
        controllerId = controller.profiles.indexOf('oculus-touch-v2') !== -1 ? 'oculus-touch-v2' : controllerId;
        controllerId = controller.profiles.indexOf('oculus-touch-v3') !== -1 ? 'oculus-touch-v3' : controllerId;
        this.displayModel = CONTROLLER_PROPERTIES[controllerId];
      }
    }
    var modelUrl = this.displayModel[data.hand].modelUrl;
    this.el.setAttribute('gltf-model', modelUrl);
  },

  injectTrackedControls: function (controller) {
    var data = this.data;
    var webXRId = GAMEPAD_ID_WEBXR;
    var webVRId = data.hand === 'right' ? 'Oculus Touch (Right)' : 'Oculus Touch (Left)';
    var id = isWebXRAvailable ? webXRId : webVRId;
    this.el.setAttribute('tracked-controls', {
      id: id,
      hand: data.hand,
      orientationOffset: data.orientationOffset,
      handTrackingEnabled: false
    });
    this.loadModel(controller);
  },

  addControllersUpdateListener: function () {
    this.el.sceneEl.addEventListener('controllersupdated', this.onControllersUpdate, false);
  },

  removeControllersUpdateListener: function () {
    this.el.sceneEl.removeEventListener('controllersupdated', this.onControllersUpdate, false);
  },

  onControllersUpdate: function () {
    // Note that due to gamepadconnected event propagation issues, we don't rely on events.
    this.checkIfControllerPresent();
  },

  onButtonChanged: function (evt) {
    if (this.displayModel === CONTROLLER_PROPERTIES['oculus-touch-v3']) { 
      this.onButtonChangedV3(evt);
    } else {      
      var button = this.mapping[this.data.hand].buttons[evt.detail.id];
      var buttonMeshes = this.buttonMeshes;
      var analogValue;
      if (!button) { return; }

      if (button === 'trigger' || button === 'grip') { analogValue = evt.detail.state.value; }

      // Update trigger and/or grip meshes, if any.
      if (buttonMeshes) {
        if (button === 'trigger' && buttonMeshes.trigger) {
          buttonMeshes.trigger.rotation.x = this.originalXRotationTrigger - analogValue * (Math.PI / 26);
        }
        if (button === 'grip' && buttonMeshes.grip) {
          buttonMeshes.grip.position.x = 
            this.originalXPositionGrip + (this.data.hand === 'left' ? -1 : 1) * analogValue * 0.004;
        }
      }
    }

    this.el.emit(button + 'changed', evt.detail.state);
  },

  onButtonChangedV3: function (evt) {
    var button = this.mapping[this.data.hand].buttons[evt.detail.id];
    var buttonMeshes = this.buttonMeshes;
    var analogValue;
    if (!button) { return; }

    analogValue = evt.detail.state.value;
    analogValue = this.data.hand === 'left' ? analogValue * -1 : analogValue;
    
    if (button === 'trigger') {
      this.triggerEuler.copy(this.buttonRanges.trigger.min.rotation);
      this.triggerEuler.x += analogValue * this.buttonRanges.trigger.diff.x;
      this.triggerEuler.y += analogValue * this.buttonRanges.trigger.diff.y;
      this.triggerEuler.z += analogValue * this.buttonRanges.trigger.diff.z;
      buttonMeshes.trigger.setRotationFromEuler(this.triggerEuler);
    }
    else if (button === 'grip') {
      buttonMeshes.grip.position.x = buttonMeshes.grip.minX + analogValue * 0.004;
    }
    else if (button === "xbutton" || button === "ybutton" || button === "abutton" || button === "bbutton" || button === "thumbstick") {
      buttonMeshes[button].position.y = analogValue === 0 ? 
        this.buttonRanges[button].minY : this.buttonRanges[button].maxY;
    }
  },

  onModelLoaded: function (evt) {
    if (this.displayModel === CONTROLLER_PROPERTIES['oculus-touch-v3']) {
      this.onModelLoadedV3(evt);
    }  else {
      var controllerObject3D = this.controllerObject3D = evt.detail.model;
      var buttonMeshes;

      if (!this.data.model) { return; }

      buttonMeshes = this.buttonMeshes = {};

      buttonMeshes.grip = controllerObject3D.getObjectByName('buttonHand');
      this.originalXPositionGrip = buttonMeshes.grip && buttonMeshes.grip.position.x;
      buttonMeshes.thumbstick = controllerObject3D.getObjectByName('stick');
      buttonMeshes.trigger = controllerObject3D.getObjectByName('buttonTrigger');
      this.originalXRotationTrigger = buttonMeshes.trigger && buttonMeshes.trigger.rotation.x;
      buttonMeshes.xbutton = controllerObject3D.getObjectByName('buttonX');
      buttonMeshes.abutton = controllerObject3D.getObjectByName('buttonA');
      buttonMeshes.ybutton = controllerObject3D.getObjectByName('buttonY');
      buttonMeshes.bbutton = controllerObject3D.getObjectByName('buttonB');
    }
    
    this.applyOffset(evt.detail.model)
    
    this.el.emit('controllermodelready', {
      name: 'oculus-touch-controls',
      model: this.data.model,
      rayOrigin: this.displayModel[this.data.hand].rayOrigin
    });
  },
  
  applyOffset(model) {
    model.position.copy(this.displayModel[this.data.hand].modelPivotOffset);
    model.rotation.copy(this.displayModel[this.data.hand].modelPivotRotation);
  },

  onModelLoadedV3(evt) {
    let controllerObject3D = this.controllerObject3D = evt.detail.model;
    let buttonMeshes, buttonRanges;

    if (!this.data.model) { return; }
    
    buttonMeshes = this.buttonMeshes = {};
    buttonRanges = this.buttonRanges = {};

    buttonMeshes.grip = controllerObject3D.getObjectByName('xr_standard_squeeze_pressed_value');
    buttonRanges.grip = {
      min: controllerObject3D.getObjectByName('xr_standard_squeeze_pressed_min'),
      max: controllerObject3D.getObjectByName('xr_standard_squeeze_pressed_max'),
    }

    buttonMeshes.grip.minX = buttonMeshes.grip.position.x;
    
    buttonMeshes.thumbstick = controllerObject3D.getObjectByName('xr_standard_thumbstick_pressed_value'); // todo: this one is pretty complex, with x/y stuff, so verify this works
    buttonRanges.thumbstick = {
      originalRotation: this.buttonMeshes.thumbstick.rotation.clone(),
      min: controllerObject3D.getObjectByName('xr_standard_thumbstick_pressed_min'),
      max: controllerObject3D.getObjectByName('xr_standard_thumbstick_pressed_max'),
      x: {
        min: controllerObject3D.getObjectByName('xr_standard_thumbstick_xaxis_pressed_min'),
        max: controllerObject3D.getObjectByName('xr_standard_thumbstick_xaxis_pressed_max'),
      },
      y: {
        min: controllerObject3D.getObjectByName('xr_standard_thumbstick_yaxis_pressed_min'),
        max: controllerObject3D.getObjectByName('xr_standard_thumbstick_yaxis_pressed_max'),
      },
    }    
    buttonRanges.thumbstick.maxY = buttonMeshes.thumbstick.position.y;
    buttonRanges.thumbstick.minY = buttonRanges.thumbstick.maxY + Math.abs(buttonRanges.thumbstick.max.position.y) - Math.abs(buttonRanges.thumbstick.min.position.y);

    buttonMeshes.trigger = controllerObject3D.getObjectByName('xr_standard_trigger_pressed_value');
    buttonRanges.trigger = {
      min: controllerObject3D.getObjectByName('xr_standard_trigger_pressed_min'),
      max: controllerObject3D.getObjectByName('xr_standard_trigger_pressed_max'),
    }
    
    this.originalXRotationTrigger = buttonMeshes.trigger.rotation.x;
    
    if (this.data.hand === 'left') {
      buttonMeshes.xbutton = controllerObject3D.getObjectByName('x_button_pressed_value');
      buttonRanges.xbutton = {
        min: controllerObject3D.getObjectByName('x_button_pressed_min'),
        max: controllerObject3D.getObjectByName('x_button_pressed_max'),
      }
      buttonRanges.xbutton.minY = buttonMeshes.xbutton.position.y;
      buttonMeshes.ybutton = controllerObject3D.getObjectByName('y_button_pressed_value');
      buttonRanges.ybutton = {
        min: controllerObject3D.getObjectByName('y_button_pressed_min'),
        max: controllerObject3D.getObjectByName('y_button_pressed_max'),
      }    
      buttonRanges.xbutton.minY = buttonMeshes.xbutton.position.y;
      buttonRanges.xbutton.maxY = buttonRanges.xbutton.minY + Math.abs(buttonRanges.xbutton.max.position.y) - Math.abs(buttonRanges.xbutton.min.position.y); 
      console.log('range x', Math.abs(buttonRanges.xbutton.max.position.y) - Math.abs(buttonRanges.xbutton.min.position.y))
      buttonRanges.ybutton.minY = buttonMeshes.ybutton.position.y;
      buttonRanges.ybutton.maxY = buttonRanges.ybutton.minY - Math.abs(buttonRanges.ybutton.max.position.y) + Math.abs(buttonRanges.ybutton.min.position.y); 
      console.log('range y', Math.abs(buttonRanges.ybutton.max.position.y) - Math.abs(buttonRanges.ybutton.min.position.y))
    }

    if (this.data.hand === 'right') {
      buttonMeshes.abutton = controllerObject3D.getObjectByName('a_button_pressed_value');
      buttonRanges.abutton = {
        min: controllerObject3D.getObjectByName('a_button_pressed_min'),
        max: controllerObject3D.getObjectByName('a_button_pressed_max'),
      }    
      buttonRanges.abutton.minY = buttonMeshes.abutton.position.y;
      buttonMeshes.bbutton = controllerObject3D.getObjectByName('b_button_pressed_value');
      buttonRanges.bbutton = {
        min: controllerObject3D.getObjectByName('b_button_pressed_min'),
        max: controllerObject3D.getObjectByName('b_button_pressed_max'),
      }
      buttonRanges.abutton.minY = buttonMeshes.abutton.position.y;
      buttonRanges.abutton.maxY = buttonRanges.abutton.minY + Math.abs(buttonRanges.abutton.max.position.y) - Math.abs(buttonRanges.abutton.min.position.y); 
      buttonRanges.bbutton.minY = buttonMeshes.bbutton.position.y;
      buttonRanges.bbutton.maxY = buttonRanges.bbutton.minY - Math.abs(buttonRanges.bbutton.max.position.y) + Math.abs(buttonRanges.bbutton.min.position.y); 
    }
    buttonRanges.trigger.diff = {
        x: Math.abs(buttonRanges.trigger.max.rotation.x) - Math.abs(buttonRanges.trigger.min.rotation.x),
        y: Math.abs(buttonRanges.trigger.max.rotation.y) - Math.abs(buttonRanges.trigger.min.rotation.y),
        z: Math.abs(buttonRanges.trigger.max.rotation.z) - Math.abs(buttonRanges.trigger.min.rotation.z),      
    }
    // [buttonRanges.grip, buttonRanges.trigger, buttonRanges.thumbstick.x, buttonRanges.thumbstick.y].forEach(rangeObj => {
      // rangeObj.diff = {
      //   x: Math.abs(rangeObj.max.rotation.x) - Math.abs(rangeObj.min.rotation.x),
      //   y: Math.abs(rangeObj.max.rotation.y) - Math.abs(rangeObj.min.rotation.y),
      //   z: Math.abs(rangeObj.max.rotation.z) - Math.abs(rangeObj.min.rotation.z),
      // }
    // })
  },

  onAxisMoved: function (evt) {
    emitIfAxesChanged(this, this.mapping[this.data.hand].axes, evt);
  },
  
  onThumbstickMoved: function(evt) {
    if (this.displayModel !== CONTROLLER_PROPERTIES['oculus-touch-v3'] || !this.buttonMeshes?.thumbstick) {return;}
    for (let axis in evt.detail) {
      this.buttonMeshes.thumbstick.rotation[this.axisMap[axis]] = 
        this.buttonRanges.thumbstick.originalRotation[this.axisMap[axis]] - 
        (Math.PI*1/8) *
        evt.detail[axis] * 
        (axis === 'y' || this.data.hand === 'right' ? -1 : 1);
    }
  },
  axisMap: {
    y: 'x',
    x: 'z',
  },

  updateModel: function (buttonName, evtName) {
    if (!this.data.model) { return; }
    this.updateButtonModel(buttonName, evtName);
  },

  updateButtonModel: function (buttonName, state) {
    var button;
    var color = (state === 'up' || state === 'touchend') ? this.data.buttonColor : state === 'touchstart' ? this.data.buttonTouchColor : this.data.buttonHighlightColor;
    var buttonMeshes = this.buttonMeshes;
    
    // no color for v3 meshes
    if (this.displayModel === CONTROLLER_PROPERTIES['oculus-touch-v3']) { return; }
    
    if (this.data.model && buttonMeshes && buttonMeshes[buttonName]) {
      button = buttonMeshes[buttonName];
      button.material.color.set(color);
      this.rendererSystem.applyColorCorrection(button.material.color);
    }
  },
});


})()