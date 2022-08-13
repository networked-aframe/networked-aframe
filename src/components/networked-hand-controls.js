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

// this is a way to bypass adding the template in to the HTML, 
// as well as the already awkward NAF.schemas.add workaround
// this makes the use of this component for the end user much simpler
function addHandTemplate(hand) {
  let templateOuter = document.createElement('template');
  let templateInner = document.createElement('a-entity');

  templateOuter.id = `${hand}-hand-template`;
  templateInner.setAttribute('networked-hand-controls',`hand: ${hand}`);

  templateOuter.appendChild(templateInner);

  NAF.schemas.schemaDict[`#${hand}-hand-template`] = {
    template: `#${hand}-hand-template`,
    components: [
      'position',
      'rotation',
      'networked-hand-controls',
    ]
  };
  NAF.schemas.templateCache[`#${hand}-hand-template`] = templateOuter;
}
["left","right"].forEach(addHandTemplate);

AFRAME.registerComponent('networked-hand-controls', {
  schema: {
    color: { default: 'white', type: 'color' },
    hand: { type: "string", default: 'left', oneOf: ['right', 'left'] },
    handModelStyle: { type: "string", default: 'highPoly', oneOf: ['lowPoly', 'highPoly', 'toon', 'controller'] },
    
    controllerComponent: { type: "string", default: '' },
    webxrControllerProfiles: { type: "string", default: '' },
    controllerEvent: {type:'array'},
    // these are set internally if we use type 'controller' for handModelStyle
    
    handModelURL: { type: "string", default: '' }, 
    // ^for specifying a custom model URL; only allowed at init, not via update
    // (must correspond to existing models and have matching animations to work properly)

    gesture: { type: "string", default: 'open' },
    visible: { type: "bool", default: false },
  },

  // cache system, protection from A-Frame optimization behavior while reducing garbage collection overhead  
  // Z: 0,
  // Y: {},  

  init() {
    this.el.setAttribute('networked', 'template', `#${this.data.hand}-hand-template`);
    this.el.setAttribute('networked', 'attachTemplateToLocal', true);

    // this.Z = Math.random();
    // this.Y[this.Z] = { contact: {}, reverse: false, isContact: false };
    
    this.el.object3D.visible = this.data.visible;
    
    this.local = this.el.components.networked.createdByMe();

    if (this.local) {
      if (this.data.handModelStyle !== 'controller') {
        Object.keys(this.buttonEventMap).forEach(evtName => {
          this.eventFunctionMap[this.data.hand][evtName] = this.handleButton.bind(this, ...this.buttonEventMap[evtName])
        })      
      }
      
      this.el.addEventListener('controllerconnected', () => {
        this.el.setAttribute('networked-hand-controls', 'visible', true);
      });
      this.el.addEventListener('controllerdisconnected', () => {
        this.el.setAttribute('networked-hand-controls', 'visible', false);
      });
    }
    else {
      this.el.classList.add('naf-remote-hand');
    }
        
    if (this.data.handModelStyle === "controller") {
      // load the controller model
      if (this.local) this.addControls(true);
      // else, will be added in update();
    }
    else {
      this.loader = new THREE.GLTFLoader();
      this.loader.setCrossOrigin('anonymous');
      const handmodelUrl = this.MODEL_BASE + this.MODEL_URLS[this.data.handModelStyle + this.data.hand.charAt(0).toUpperCase() + this.data.hand.slice(1)];
      
      this.loader.load(this.data.handModelURL || handmodelUrl, gltf => {
        const newMesh = gltf.scene.children[0];
        const handModelOrientation = this.data.hand === 'left' ? Math.PI / 2 : -Math.PI / 2;
        newMesh.mixer = new THREE.AnimationMixer(newMesh);

        this.clips = gltf.animations;
        this.clips.forEach((clip, clipIndex) => {
        this.clipNameToClip[clip.name] = clip;
        })      

        this.el.setObject3D('mesh', newMesh);

        const handMaterial = newMesh.children[1].material;
        handMaterial.color = new THREE.Color(this.data.handColor);
        newMesh.position.set(0, 0, 0);
        newMesh.rotation.set(0, 0, handModelOrientation);

        if (this.local) this.addControls(false);

        const color = new THREE.Color(this.data.color);
        this.getMesh().children[1].material.emissive = color;
        this.getMesh().children[1].material.color = color;
        this.getMesh().children[1].material.metalness = 1;
      });    
    }
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
    
    if (!this.local) {
      if (this.data.handModelStyle !== this.str.controller && this.data.gesture !== oldData.gesture) {
        this.handleGesture(this.data.gesture, oldData.gesture);
      }

      if (this.data.handModelStyle === this.str.controller) {
        if (this.data.controllerComponent &&
            (this.data.controllerComponent !== oldData.controllerComponent || 
            this.data.webxrControllerProfiles[0] !== oldData.webxrControllerProfiles[0])
        ) {
          this.injectRemoteControllerModel();
        }

        // receiving controller events
        if (Array.isArray(oldData.controllerEvent) && (
          oldData.controllerEvent[0] !== this.data.controllerEvent[0] || 
          oldData.controllerEvent[1] !== this.data.controllerEvent[1])
          ) {
          console.log("will update controller model with received button event", this.data, this.data.controllerEvent, this.el.components[this.data.controllerComponent])
          this.el.components[this.data.controllerComponent].updateModel(...this.data.controllerEvent);
        } 
      }
    }
  },

  remove() {
    this.el.removeObject3D('mesh');
  },

  controllerComponents: [
    'magicleap-controls',
    'vive-controls',
    'oculus-touch-controls',
    'windows-motion-controls',
    'hp-mixed-reality-controls',
    'valve-index-controls', // added, but not tested.
  ],

  injectControlsWrapper(originalFn, controllerComponentName, webxrControllerSymbol) {
    // lets us peek at the model argument passed in by AFRAME.utils.trackedControls.findMatchingControllerWebXR
    // (first two are curried, third is passed in)
    this.el.setAttribute('networked-hand-controls', {
      controllerComponent: controllerComponentName,
      webxrControllerProfiles: JSON.stringify(webxrControllerSymbol.profiles),
        // this is the only part that is actually used, so we're send that and reconstruct it.
    });
    originalFn(webxrControllerSymbol);
    
    this.el.components[controllerComponentName].updateModel = 
      this.updateModelWrapper.bind(
        this, 
        this.el.components[controllerComponentName].updateModel.bind(
          this.el.components[controllerComponentName]
        )
      );
  },

  updateModelWrapper(originalFn, buttonName, evtName) {
    // intercept events and broadcast them to remote versions
    this.el.setAttribute('networked-hand-controls', this.str.controllerEvent, `${buttonName}, ${evtName}`);
    originalFn(buttonName, evtName);
  },

  addControls(useControllerModel) {
    this.controllerComponents.forEach(controllerComponentName => {
      this.el.setAttribute(controllerComponentName, {hand: this.data.hand, model: useControllerModel});

      // here we inject a wrapper that allows us to extract enough info to replicate this controller to an NAF instance.
      this.el.components[controllerComponentName].injectTrackedControls = 
        this.injectControlsWrapper.bind(
          this,
          this.el.components[controllerComponentName].injectTrackedControls.bind(this.el.components[controllerComponentName]),
          controllerComponentName,
        );
    })
    this.isViveController();
  },

  injectRemoteControllerModel() {
    // this is for a networked controller entity, where we want to show a non-hand controller model
    // we add the relevant controller component, and then hack it just a bit to:
    // A) convince it to show without relation to whether it is actually connected, and 
    // B) to not track _local_ pose data (so, no tracked-controller component)

    // we pause it so we can hack the component a bit before we let it init()
    this.el.pause();

    // we add the actual component, to get the model generated and hopefully to grab button model updates in the future
    this.el.setAttribute(this.data.controllerComponent, {
      hand: this.data.hand, 
      model: true,
      buttonColor: 'green', 
      buttonTouchColor: 'yellow',
      buttonHighlightColor: 'red', 
    });

    // we don't want the remote model to listen to local button/trigger/joystick events, though 
    this.el.components[this.data.controllerComponent].removeEventListeners();
    this.el.components[this.data.controllerComponent].removeControllersUpdateListener();

    // however, we do still want _one_ event listener:
    this.el.addEventListener('model-loaded', this.el.components[this.data.controllerComponent].onModelLoaded);
    // (note that it is already bound within that component's 'init'.)

    // we load the model indicated by the remote user's headset
    this.el.components[this.data.controllerComponent].loadModel({profiles:JSON.parse(this.data.webxrControllerProfiles)});

    if (!this.el.components[this.data.controllerComponent].checkIfControllerPresent && 
        !this.el.components[this.data.controllerComponent].injectTrackedControls) {
      // since this is a _bit_ of a hack, we include a fallback and logging and self-detection of hack success
      // this is pretty robust, however, as A-Frame treats injectTrackedControls() as a psuedo-standard among all controller components
      // (it must be in order to be called by utils/trackedControllers.js, which is needed to look up the controller model ID)
      console.error("likely error, seems like path used to bypass local pose tracking failed; please notify NAF maintainers.");
      console.log(this.el, this.el.components);
      this.el.components[this.data.controllerComponent].remove();
    } else {
      // this prevents injectTrackedControllers from running, which prevents the 
      // tracked-controls-webxr component from being added, which is responsible for pose tracking
      // (which we are disabling, since we want this controller to follow this NAF entity instead)
      this.el.components[this.data.controllerComponent].checkIfControllerPresent = x => x;
      this.el.components[this.data.controllerComponent].injectTrackedControls = x => x;
    }
    this.el.play();
    this.injectedController = true;
  },


  getMesh() {
    return this.el.getObject3D(this.str.mesh)
  },
  
  // local hands are controlled by one's controllers
  // non-local hands are controlled by updates via NAF
  local: false,
  
  clipNameToClip: {},
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
    // these seem to not be used
    // thumbstickdown: ['thumbstick', 'down'],
    // thumbstickup: ['thumbstick', 'up'],  
  },

  addEventListeners() {
    Object.keys(this.buttonEventMap).forEach(evtName => {
      this.el.addEventListener(evtName, this.eventFunctionMap[this.data.hand][evtName])
    })
  },

  removeEventListeners() {
    Object.keys(this.buttonEventMap).forEach(evtName => {
      this.el.removeEventListener(evtName, this.eventFunctionMap[this.data.hand][evtName])
    })
  },

  // to minimize garbage collection, prevents generating huge numbers of one-time-use strings
  str: {
    nafHandControls: "networked-hand-controls",
    gesture: "gesture",
    mesh: "mesh",
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
    this.isContact = evt === this.str.down || evt === this.str.touchstart;

    if (this.isContact === this.contact[button]) {
      return;
    }
    this.contact[button] = this.isContact;

    this.lastGesture = this.data.gesture;
    this.determineGesture();
    if (this.gesture === this.lastGesture) { return; }

    // set new gesture into schema to propagate via NAF
    this.el.setAttribute(this.str.nafHandControls, this.str.gesture, this.gesture);

    this.handleGesture();
  },

  handleGesture() {
    if (this.data.gesture === this.lastGesture) { return; } 
    
    this.playAnimation();

    this.emitGestureEvents();
  },

  // note: using preserved references to reduce garbage collection, as this function can fire thousands of times.
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
    else { // Vive handling was supposedly left incomplete
      this.gesture = 
        this.gripIsActive || 
        this.triggerIsActive ?
                          this.str.fist :
        this.contact.trackpad ||
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

    // Stop all current animations.
    this.getMesh().mixer.stopAllAction();
  
    // Grab clip action.
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

    // Animate or crossfade from gesture to gesture.
    this.clip = this.clipNameToClip[this.ANIMATIONS[this.lastGesture]];
    this.fromAction = this.getMesh().mixer.clipAction(this.clip);
    this.fromAction.weight = 0.15;
    this.fromAction.play();
    this.toAction.play();
    this.fromAction.crossFadeTo(this.toAction, 0.15, true);
  },

  // see https://github.com/aframevr/assets.
  MODEL_BASE: 'https://cdn.aframe.io/controllers/hands/',
  MODEL_URLS: {
    toonLeft: 'leftHand.glb',
    toonRight: 'rightHand.glb',
    lowPolyLeft: 'leftHandLow.glb',
    lowPolyRight: 'rightHandLow.glb',
    highPolyLeft: 'leftHandHigh.glb',
    highPolyRight: 'rightHandHigh.glb',
  },

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

  // preventing garbage collection by establishing these as part of the prototype:
  contact: {
    grip: false,
    trigger: false,
    surface: false,
    trackpad: false,
    AorX: false,
    BorY: false,
  },
  reverse: false,
  isContract: false, 
  injectedController: false,
  lastGesture: null,
  gesture: null,
  gripIsActive: false,
  triggerIsActive: false,
  thumbIsActive: false,
  clip: null,
  toAction: null,
  fromAction: null,  
});
