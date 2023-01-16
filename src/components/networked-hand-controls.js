/* global THREE, AFRAME, NAF */

/**
 * Represent any 6dof controller as a hand with live tracked animated gestures and normalized events.
 *
 * Updated and modified adaption of https://github.com/aframevr/aframe/blob/master/src/components/hand-controls.js
 * Designed for use with NAF, but can also be used without NAF.
 *
 * Auto-detects appropriate controller.
 * Handles common events coming from the detected vendor-specific controls.
 * Loads hand model with gestures that are applied based on the button pressed.
 * Translate button events to semantic hand-related event names:
 * (fist, thumbUp, point, hold, open, pistol) + (start, end)
 * note that the events were incomplete/broken in prior implementation, and therefore a breaking change
 */

// this is a way to bypass adding the template in to the HTML, as well as the already awkward NAF.schemas.add 
// workaround. this makes the use of this component for the end user much simpler.
function addHandTemplate(hand) {
  const templateOuter = document.createElement('template');
  const templateInner = document.createElement('a-entity');

  templateOuter.id = `${hand}-hand-default-template`;
  templateInner.setAttribute('rotation', '0 0 0'); // to set the YXZ order
  templateInner.setAttribute('networked-hand-controls', `hand: ${hand}`);

  templateOuter.appendChild(templateInner);

  const refTemplateId = `#${templateOuter.id}`;
  NAF.schemas.schemaDict[refTemplateId] = {
    template: refTemplateId,
    components: [
      {
        component: 'position',
        requiresNetworkUpdate: NAF.utils.vectorRequiresUpdate(0.001)
      },
      {
        component: 'rotation',
        requiresNetworkUpdate: NAF.utils.vectorRequiresUpdate(0.5)
      },
      'networked-hand-controls'
    ]
  };
  NAF.schemas.templateCache[refTemplateId] = templateOuter;
}
["left","right"].forEach(addHandTemplate);

AFRAME.registerComponent('networked-hand-controls', {
  schema: {
    color: { default: 'white', type: 'color' },
    hand: { type: "string", default: 'left', oneOf: ['right', 'left'] },
    handModelStyle: { type: "string", default: 'highPoly', oneOf: ['lowPoly', 'highPoly', 'toon', 'controller'] },
    
    // these are set internally if we use type 'controller' for handModelStyle
    controllerComponent: { type: "string", default: '' },
    webxrControllerProfiles: { type: "string", default: '' },
    controllerEvent: {
      default: JSON.stringify({}),
      type: "string",
    },
    controllerModelUpdate: {
      default: [],
      type: "array",
    },

    // these are for specifying a custom hand model URL; only allowed at init, not via update
    // (must correspond to existing models and have matching animations to work properly)
    customHandModelURL: { type: "string", default: '' }, 

    // this is set internally when using a hand model
    gesture: { type: "string", default: 'open' },

    // this is set internally, hands are invisible until webxr controller is connected
    visible: { type: "bool", default: false },
  },

  init() {
    this.setup();
    this.rendererSystem = this.el.sceneEl.systems.renderer;

    if (this.data.handModelStyle !== "controller") {
      this.addHandModel();
    }

    NAF.utils.getNetworkedEntity(this.el).then((networkedEl) => {
      // Here networkedEl may be different than this.el if we don't use nested
      // networked components for hands.
      this.local = networkedEl.components.networked.createdByMe();
    }).catch(() => {
      this.local = true;
    }).then(() => {
      if (this.local) {
        this.addControllerComponents(this.data.handModelStyle === "controller");
        // Bind all functions, the listeners are only registered later for local avatar.
        for (const evtName in this.buttonEventMap) {
          this.eventFunctionMap[this.data.hand][evtName] = this.handleButton.bind(this, ...this.buttonEventMap[evtName]);
        }
        for (const evtName in this.visibleListeners) {
          this.eventFunctionMap[this.data.hand][evtName] = this.visibleListeners[evtName].bind(this);
        }
      } else {
        // Adding a class to easily see what the entity is in the aframe
        // inspector. This is shown in the class field in the panel after you
        // click the entity.
        this.el.classList.add('naf-remote-hand');
      }
    });
  },

  play() {
    if (this.local) {
      this.addEventListeners();
    }
  },

  pause() {
    if (this.local) {
      this.removeEventListeners();
    }
  },

  tick(time, delta) {
    if (this.getMesh()?.mixer) this.getMesh().mixer.update(delta / 1000);
  },
  
  update(oldData) {   
    if (oldData.visible != this.data.visible) {
      this.el.object3D.visible = this.data.visible;     
    }

    // this block is for handling updates() from hand model to controller model, or vice versa.
    if (oldData.handModelStyle &&
        oldData.handModelStyle !== this.data.handModelStyle
      ) {
      // first, remove old model
      if (this.getMesh()) this.el.removeObject3D(this.str.mesh);
      ['gltf-model','obj-model'].forEach(modelComponent => {
        if (this.el.components[modelComponent]) {
          this.el.removeAttribute(modelComponent);
        }
      })
      // then, add correct model
      if (this.data.handModelStyle !== "controller") {
        this.addHandModel();
      }
      else {
        // it would be nice if this worked, but those components don't handle this option in their update() methods:
        // this.el.setAttribute(this.data.controllerComponent, 'model', true)

        // so we first remove the controller component
        if (this.data.controllerComponent && this.el.components[this.data.controllerComponent]) {
          this.el.removeAttribute(this.data.controllerComponent);
        }

        if (!this.local) {
          if (!this.injectedController && this.data.controllerComponent && this.data.webxrControllerProfiles[0]) {
            this.injectRemoteControllerModel();
          }
        }
        else {
          this.addControllerComponents(true);
          // controllerconnected event won't fire again, so we have to call this manually:
          this.el.components[this.data.controllerComponent].injectTrackedControls({profiles:JSON.parse(this.data.webxrControllerProfiles)})
        }
      }
    }

    if (oldData.color &&
        this.data.handModelStyle !== this.str.controller &&
        oldData.color !== this.data.color) {
      this.updateHandMeshColor();
    }
    
    // this block is for receiving+handling networked hand gestures and button events for controller model updates
    // and for initial injection of remote controller model
    if (!this.local) {
      if (this.data.handModelStyle !== this.str.controller && this.data.gesture !== oldData.gesture) {
        this.handleGesture(this.data.gesture, oldData.gesture);
      }
      else if (this.data.handModelStyle === this.str.controller) {
        if (!this.injectedController && this.data.controllerComponent && this.data.webxrControllerProfiles[0]) {
          this.injectRemoteControllerModel();
        }
        if (oldData.controllerEvent && oldData.controllerEvent !== this.data.controllerEvent) {
          const controllerEvent = JSON.parse(this.data.controllerEvent);
          this.el.components[this.data.controllerComponent][controllerEvent.type === 'thumbstickmoved' ? 'onThumbstickMoved' : 'onButtonChanged'](controllerEvent);
        }
        if (oldData.controllerModelUpdate && (
          oldData.controllerModelUpdate[0] !== this.data.controllerModelUpdate[0] ||
          oldData.controllerModelUpdate[1] !== this.data.controllerModelUpdate[1] 
        )) {
          this.el.components[this.data.controllerComponent].updateModel(...this.data.controllerModelUpdate)
        }
      }
    }
  },

  remove() {
    this.el.removeObject3D(this.str.mesh);
  },

  addHandModel() {
    this.loader = new THREE.GLTFLoader();
    this.loader.setCrossOrigin('anonymous');
    const handmodelUrl = this.MODEL_BASE + this.MODEL_NAMES[this.data.handModelStyle + this.data.hand.charAt(0).toUpperCase() + this.data.hand.slice(1)];
    
    this.loader.load(this.data.customHandModelURL || handmodelUrl, gltf => {
      const newMesh = gltf.scene.children[0];
      const handModelOrientation = this.data.hand === 'left' ? Math.PI / 2 : -Math.PI / 2;
      newMesh.mixer = new THREE.AnimationMixer(newMesh);

      this.clips = gltf.animations;
      this.clips.forEach((clip) => {
        this.clipNameToClip[clip.name] = clip;
      })      

      this.el.setObject3D(this.str.mesh, newMesh);

      const handMaterial = newMesh.children[1].material;
      handMaterial.color = new THREE.Color(this.data.color);
      this.rendererSystem.applyColorCorrection(handMaterial.color);
      newMesh.position.set(0, 0, 0);
      newMesh.rotation.set(0, 0, handModelOrientation);
    });
  },

  updateHandMeshColor() {
    const mesh = this.getMesh();
    if (!mesh) return;
    const handMaterial = mesh.children[1].material;
    handMaterial.color.set(this.data.color);
    this.rendererSystem.applyColorCorrection(handMaterial.color);
  },

  controllerComponents: [
    'magicleap-controls',
    'vive-controls',
    'oculus-touch-controls',
    'windows-motion-controls',
    'hp-mixed-reality-controls',
    
    // these were missing from the original hand-controls component:
    'valve-index-controls',
    // some older models that it doesn't hurt to include:
    'oculus-go-controls',
    'gearvr-controls',
    'daydream-controls',
    'vive-focus-controls',
  ],

  addControllerComponents(useControllerModel) {    
    // this adds all controller components, with wrappers set up to capture and broadcast model found and relevant button presses
    this.controllerComponents.forEach(controllerComponentName => {
      if (this.data.controllerComponent && this.data.controllerComponent !== controllerComponentName) {return;}
      
      this.el.setAttribute(controllerComponentName, {hand: this.data.hand, model: useControllerModel});

      // (note: this could possibly be rewritten to rely on the controllerconnected event)
      this.el.components[controllerComponentName].injectTrackedControls = 
        this.injectControlsWrapper.bind(
          this,
          this.el.components[controllerComponentName].injectTrackedControls.bind(this.el.components[controllerComponentName]),
          controllerComponentName,
      );
    })

    this.isViveController();
  },

  injectControlsWrapper(originalFn, controllerComponentName, webxrControllerSymbol) {
    // captures and rebroadcasts the model found by AFRAME.utils.trackedControls.findMatchingControllerWebXR
    this.el.setAttribute('networked-hand-controls', {
      controllerComponent: controllerComponentName,
      webxrControllerProfiles: JSON.stringify(webxrControllerSymbol.profiles),
    });
    originalFn(webxrControllerSymbol);
    
    // this function handles mesh color updates
    this.el.components[controllerComponentName].updateModel = 
      this.updateModelWrapper.bind(
        this, 
        this.el.components[controllerComponentName].updateModel.bind(
          this.el.components[controllerComponentName]
        )
      );

    this.el.components[controllerComponentName].onButtonChanged = 
      this.onButtonChangedWrapper.bind(
        this,
        this.el.components[controllerComponentName].onButtonChanged
      )

    this.el.components[controllerComponentName].onThumbstickMoved = 
      this.onThumbstickMovedWrapper.bind(
        this,
        this.el.components[controllerComponentName].onThumbstickMoved
      )

    // we want to strip the listeners pointing to the original functions, and then re-add them with our wrapped functions
    this.el.components[controllerComponentName].removeEventListeners()
    this.el.components[controllerComponentName].addEventListeners()
  },

  onButtonChangedWrapper(originalFn, evt) {
    this.el.setAttribute('networked-hand-controls', this.str.controllerEvent, JSON.stringify({detail:evt.detail,type:evt.type}));
    originalFn(evt);
  },

  onThumbstickMovedWrapper(originalFn, evt) {
    this.el.setAttribute('networked-hand-controls', this.str.controllerEvent, JSON.stringify({detail:evt.detail,type:evt.type}));    
    originalFn(evt);
  },

  updateModelWrapper(originalFn, buttonName, evtName) {
    // capture and rebroadcast controller events (only used if using controller model instead of hand)
    if (!this.btnEvtMap[buttonName]) {this.btnEvtMap[buttonName] = {};}
    if (!this.btnEvtMap[buttonName][evtName]) {this.btnEvtMap[buttonName][evtName] = `${buttonName},${evtName}`}
    this.el.setAttribute('networked-hand-controls', "controllerModelUpdate", this.btnEvtMap[buttonName][evtName]);
    originalFn(buttonName, evtName);
  },

  catchPoseTrackingInitialization() {
    this.catchAndRemoveWebXRTracking = (function catchAndRemoveWebXRTracking (evt) {
      if (evt.detail.name !== 'tracked-controls-webxr') { return; }
      this.el.removeEventListener('componentinitialized', this.catchAndRemoveWebXRTracking);
      this.el.removeAttribute('tracked-controls-webxr');
    }).bind(this);
    this.el.addEventListener('componentinitialized', this.catchAndRemoveWebXRTracking);
  },

  injectRemoteControllerModel() {
    // this is for a networked controller entity, where we want to show a non-hand controller model
    // we add the relevant controller component, and then hack it just a bit to:
    // A) convince it the model show without relation to whether one is actually locally connected, and 
    // B) to not track _local_ pose data (so, no prevent/remove tracked-controller component)

    // we pause the element so we can prevent pose tracking from being added.
    this.el.pause();

    // we add the actual component, to get the model generated and button meshes and event handling
    this.el.setAttribute(this.data.controllerComponent, {
      hand: this.data.hand, 
      model: true,
      // could also optionally support custom buttonColor, buttonTouchColor, buttonHighlightColor 
    });

    // in new design, we leave this, as the controller needs to emit some of these events to itself
    // in order to get mesh color updates
    // this.el.components[this.data.controllerComponent].removeEventListeners();

    // we don't want the remote model to listen to local button/trigger/thumbstick events, though 
    this.el.components[this.data.controllerComponent].removeControllersUpdateListener();

    // some older controller components aren't as well written, and so we have to allow pose tracking to be added and then remove it
    if (!this.el.components[this.data.controllerComponent].checkIfControllerPresent ||
        !this.el.components[this.data.controllerComponent].loadModel
        ) {
      console.warn("fallback path: will add and then disable pose tracking", this.data.controllerComponent, this.el, this.el.components);

      // however, we do still want _one_ event listener, so we add the button meshes
      this.el.addEventListener('model-loaded', this.el.components[this.data.controllerComponent].onModelLoaded);

      this.catchPoseTrackingInitialization();
      // here we have no loadModel() to use directly, so we fully inject (bypassing controller detection)
      // and catch and remove pose tracking once it is added.
      this.el.components[this.data.controllerComponent].injectTrackedControls({profiles:JSON.parse(this.data.webxrControllerProfiles)});
    }
    else {
      // ideal, default path, for controller components (like oculus-touch-controls), that have separate loadModel() function

      // this prevents injectTrackedControllers from running, which prevents the 
      // tracked-controls-webxr component from being added, which is responsible for pose tracking
      // (which we are disabling, since we want this controller to follow this NAF entity instead)
      this.el.components[this.data.controllerComponent].checkIfControllerPresent = x => x;
      this.el.components[this.data.controllerComponent].injectTrackedControls = x => x;
      
      // we need to fire this listener to load the button meshes
      this.el.addEventListener('model-loaded', this.el.components[this.data.controllerComponent].onModelLoaded);
      // we load the model indicated by the remote user's headset
      this.el.components[this.data.controllerComponent].loadModel({profiles:JSON.parse(this.data.webxrControllerProfiles)});      
    }

    this.el.play();
    this.injectedController = true;
  },

  getMesh() {
    return this.el.getObject3D(this.str.mesh)
  },
  
  // local hands are controlled by one's controllers, non-local hands are controlled by updates via NAF
  local: false,
  
  eventFunctionMap: {left:{}, right: {}},
  buttonEventMap: {
    gripdown: ['grip', 'down'],
    gripup: ['grip', 'up'],
    trackpaddown: ['trackpad', 'down'],
    trackpadup: ['trackpad', 'up'],
    trackpadtouchstart: ['trackpad', 'touchstart'],
    trackpadtouchend: ['trackpad', 'touchend'],
    triggerdown: ['trigger', 'down'],
    triggerup: ['trigger', 'up'],
    triggertouchstart: ['trigger', 'touchstart'],
    triggertouchend: ['trigger', 'touchend'],
    griptouchstart: ['grip', 'touchstart'],
    griptouchend: ['grip', 'touchend'],    
    abuttontouchstart: ['AorX', 'touchstart'],
    abuttontouchend: ['AorX', 'touchend'],
    bbuttontouchstart: ['BorY', 'touchstart'],
    bbuttontouchend: ['BorY', 'touchend'],
    xbuttontouchstart: ['AorX', 'touchstart'],
    xbuttontouchend: ['AorX', 'touchend'],
    ybuttontouchstart: ['BorY', 'touchstart'],
    ybuttontouchend: ['BorY', 'touchend'],
    surfacetouchstart: ['surface', 'touchstart'],
    surfacetouchend: ['surface', 'touchend'],

    // these are not used for any existing gestures
    // thumbstickdown: ['thumbstick', 'down'],
    // thumbstickup: ['thumbstick', 'up'],  
  },

  visibleListeners: {
    // (note: while `this.el` looks wrong here, we use .bind() on it within init())
    controllerconnected() {
      this.el.setAttribute('networked-hand-controls', 'visible', true);
    },
    controllerdisconnected() {
      this.el.setAttribute('networked-hand-controls', 'visible', false);
    }
  },

  addEventListeners() {
    for (const evtName in this.buttonEventMap) {
      this.el.addEventListener(evtName, this.eventFunctionMap[this.data.hand][evtName]);
    }
    for (const evtName in this.visibleListeners) {
      this.el.addEventListener(evtName, this.eventFunctionMap[this.data.hand][evtName]);
    }
  },

  removeEventListeners() {
    for (const evtName in this.buttonEventMap) {
      this.el.removeEventListener(evtName, this.eventFunctionMap[this.data.hand][evtName]);
    }
    for (const evtName in this.visibleListeners) {
      this.el.removeEventListener(evtName, this.eventFunctionMap[this.data.hand][evtName]);
    }
  },

  // to minimize garbage collection, prevents generating huge numbers of one-time-use strings
  str: {
    nafHandControls: "networked-hand-controls",
    mesh: "mesh",
    gesture: "gesture",
    down: 'down',
    touchstart: 'touchstart',
    fist: "fist",
    point: "point",
    thumbUp: "thumbUp",
    pistol: "pistol",
    hold: "hold",
    open: "open",
    controller: "controller",
    controllerEvent: "controllerEvent",
  },

  handleButton(button, evt) {
    // this function is only for generating networked gestures with hand model
    if (this.data.handModelStyle === 'controller') {return}

    this.isContact = evt === this.str.down || evt === this.str.touchstart;

    if (this.isContact === this.contact[button]) {return}
    this.contact[button] = this.isContact;

    this.lastGesture = this.data.gesture;
    this.determineGesture();
    if (this.gesture === this.lastGesture) {return}

    // set new gesture into schema to propagate via NAF
    this.el.setAttribute(this.str.nafHandControls, this.str.gesture, this.gesture);

    this.handleGesture();
  },

  handleGesture() {
    if (this.data.gesture === this.lastGesture) {return} 
    this.playAnimation();
    this.emitGestureEvents();
  },

  determineGesture() {
    this.gripIsActive = this.contact.grip;
    this.triggerIsActive = this.contact.trigger
    this.thumbIsActive = 
          this.contact.trackpad || this.contact.surface 
          this.contact.AorX || this.contact.BorY;
    
    if (!this.isVive) {
      this.gesture = 
          this.gripIsActive && 
          this.thumbIsActive &&
          this.triggerIsActive ?
                          this.str.fist :
          this.gripIsActive && 
          this.thumbIsActive && 
        !this.triggerIsActive ?
                          this.str.point :
          this.gripIsActive && 
        !this.thumbIsActive && 
          this.triggerIsActive ?
                          this.str.thumbUp :
          this.gripIsActive && 
        !this.thumbIsActive && 
        !this.triggerIsActive ?
                          this.str.pistol :
          this.triggerIsActive ?
                          this.str.hold :
                          this.str.open ;
    }
    else {
      // Vive handling was supposedly left incomplete
      this.gesture = 
        this.gripIsActive || 
        this.triggerIsActive ?
                          this.str.fist :
        this.contact.trackpad ?
                          this.str.point :
                          this.str.open ;
    }
  },

  emitGestureEvents() {
    this.el.emit(
      this.eventNames[this.lastGesture]?.inactive    
    );
    this.el.emit(
      this.eventNames[this.data.gesture]?.active
    );
  },
  
  // mapping rather than function to reduce garbage collection
  eventNames: {
    fist: {active: "fiststart", inactive: "fistend"},
    thumbUp: {active: "thumbupstart", inactive: "thumbupend"},
    point: {active: "pointstart", inactive: "pointend"},
    hold: {active: "holdstart", inactive: "holdend"},
    open: {active: "openstart", inactive: "openend"},
    pistol: {active: "pistolstart", inactive: "pistolend"},
  },
  
  playAnimation() {
    // this function seems like it could be improved
    // implementation is from the original hand-controls component

    if (!this.getMesh()) { return; }

    // Stop all current animations
    this.getMesh().mixer.stopAllAction();
  
    // Grab clip action
    this.clip = this.clipNameToClip[this.ANIMATIONS[this.data.gesture]];
    this.toAction = this.getMesh().mixer.clipAction(this.clip);
    this.toAction.clampWhenFinished = true;
    this.toAction.loop = THREE.LoopRepeat;
    this.toAction.repetitions = 0;
    this.toAction.timeScale = this.reverse ? -1 : 1;
    this.toAction.time = this.reverse ? this.clip.duration : 0;
    this.toAction.weight = 1;

    if (!this.lastGesture || this.data.gesture === this.lastGesture) {
      this.getMesh().mixer.stopAllAction();
      this.toAction.play();
      return;
    }

    // Animate or crossfade from gesture to gesture
    this.clip = this.clipNameToClip[this.ANIMATIONS[this.lastGesture]];
    this.fromAction = this.getMesh().mixer.clipAction(this.clip);
    this.fromAction.weight = 0.15;
    this.fromAction.play();
    this.toAction.play();
    this.fromAction.crossFadeTo(this.toAction, 0.15, true);
  },

  // see https://github.com/aframevr/assets
  MODEL_BASE: 'https://cdn.aframe.io/controllers/hands/',
  MODEL_NAMES: {
    toonLeft: 'leftHand.glb',
    toonRight: 'rightHand.glb',
    lowPolyLeft: 'leftHandLow.glb',
    lowPolyRight: 'rightHandLow.glb',
    highPolyLeft: 'leftHandHigh.glb',
    highPolyRight: 'rightHandHigh.glb',
  },

  clipNameToClip: {},

  // map from internal state names to the names of the clips as specified within the models
  ANIMATIONS: {
    open: 'Open',
    point: 'Point',
    pistol: 'Point + Thumb',
    fist: 'Fist',
    hold: 'Hold',
    thumbUp: 'Thumb Up',
  },

  isVive: false,
  isViveController() {
    let controller = this.el.components['tracked-controls'] && this.el.components['tracked-controls'].controller;
    this.isVive = controller && (controller.id && controller.id.indexOf('OpenVR ') === 0 ||
      (controller.profiles &&
        controller.profiles[0] &&
        controller.profiles[0] === 'htc-vive'));
  },

  btnEvtMap: {}, // dynamically populated, but actually helpful if prototype is modified

  setup() {
    // preventing garbage collection by making sure these don't end up as part of the prototype
    this.contact = {
      grip: false,
      trigger: false,
      surface: false,
      trackpad: false,
      AorX: false,
      BorY: false,
    };
    this.reverse = false;
    this.isContact = false; 
    this.injectedController = false;
    this.lastGesture = "";
    this.gesture = "";
    this.gripIsActive = false;
    this.triggerIsActive = false;
    this.thumbIsActive = false;
    this.clip = null;
    this.toAction = null;
    this.fromAction = null;  
  }
});
