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

  // aAssets.appendChild(templateOuter); // can't do this, called before dom tree creation
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
    handModelStyle: { type: "string", default: 'highPoly', oneOf: ['lowPoly', 'highPoly', 'toon'] },
    
    handModelURL: { type: "string", default: '' }, 
    // ^for specifying a custom model URL; only allowed at init, not via update
    // (must correspond to existing models and have matching animations to work properly)

    gesture: { type: "string", default: 'open' },
    visible: { type: "bool", default: false },
  },

  init() {
    this.el.setAttribute('networked', 'template', `#${this.data.hand}-hand-template`);
    this.el.setAttribute('networked', 'attachTemplateToLocal', true);

    this.Z = Math.random();
    this.Y[this.Z] = { contact: {}, reverse: false, isContact: false };
    
    this.el.object3D.visible = this.data.visible;
    
    this.checkLocalHand();
    if (this.local) {
      Object.keys(this.buttonEventMap).forEach(evtName => {
        this.eventFunctionMap[this.data.hand][evtName] = this.handleButton.bind(this, ...this.buttonEventMap[evtName])
      })      
      
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
        
    this.loader = new THREE.GLTFLoader();
    this.loader.setCrossOrigin('anonymous');
    
    const handmodelUrl = this.MODEL_BASE + this.MODEL_URLS[this.data.handModelStyle + this.data.hand.charAt(0).toUpperCase() + this.data.hand.slice(1)];

    // could add tracked controller models here, too--but would need more work to complete, as just adding
    // the controller components from A-Frame core directly would wire up a bunch of events that we don't want for
    // networked controllers.
    // if (this.data.handModelStyle === "controller") {
    //   this.addControls(true);
    // }
    // else {
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

        this.addControls(false);

        const color = new THREE.Color(this.data.color);
        this.getMesh().children[1].material.emissive = color;
        this.getMesh().children[1].material.color = color;
        this.getMesh().children[1].material.metalness = 1;
      });    
    // }
  },

  addControls(model) {
    if (this.local) {
      const controlConfiguration = {
        hand: this.data.hand,
        model,
      };        
      this.el.setAttribute('magicleap-controls', controlConfiguration);
      this.el.setAttribute('vive-controls', controlConfiguration);
      this.el.setAttribute('oculus-touch-controls', controlConfiguration);
      this.el.setAttribute('windows-motion-controls', controlConfiguration);
      this.el.setAttribute('hp-mixed-reality-controls', controlConfiguration);
      this.isViveController();
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
    
    if (!this.local && (this.data.gesture != oldData.gesture)) {
      this.handleGesture(this.data.gesture, oldData.gesture);
    }
  },

  remove() {
    this.el.removeObject3D('mesh');
  },
  
  // cache system, protection from A-Frame optimization behavior while reducing garbage collection overhead  
  Z: 0,
  Y: {},
  
  getMesh() {
    return this.el.getObject3D(this.str.mesh)
  },
  
  // local hands are controlled by one's controllers
  // non-local hands are controlled by updates via NAF
  local: false,
  checkLocalHand() {
    // this.local = this.el.components.networked.data.owner == NAF.clientId;
    // ^while this would be more ideal, NAF doesn't populate the owner until later
    // and we need to know this at init(), and we can't supply schema options
    // when instantiating a template instance--so, we require adding a class for now.
    if (this.el.classList.contains("local-naf-hand")) this.local = true;
  },
  
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
  },

  handleButton(button, evt) {    
    this.Y[this.Z].isContact = evt === this.str.down || evt === this.str.touchstart;

    if (this.Y[this.Z].isContact === this.Y[this.Z].contact[button]) {
      return;
    }
    this.Y[this.Z].contact[button] = this.Y[this.Z].isContact;

    this.Y[this.Z].lastGesture = this.data.gesture;
    this.determineGesture();
    if (this.Y[this.Z].gesture === this.Y[this.Z].lastGesture) { return; }

    // set new gesture into schema to propagate via NAF
    this.el.setAttribute(this.str.nafHandControls, this.str.gesture, this.Y[this.Z].gesture);

    this.handleGesture();
  },

  handleGesture() {
    if (this.data.gesture === this.Y[this.Z].lastGesture) { return; } 
    
    this.playAnimation();

    this.emitGestureEvents();
  },
  
  // note: using preserved references to reduce garbage collection, as this function can fire thousands of times.
  determineGesture() {
    this.Y[this.Z].gripIsActive = this.Y[this.Z].contact.grip;
    this.Y[this.Z].triggerIsActive = this.Y[this.Z].contact.trigger
    this.Y[this.Z].thumbIsEngaged = 
          this.Y[this.Z].contact.trackpad || this.Y[this.Z].contact.surface 
          this.Y[this.Z].contact.AorX || this.Y[this.Z].contact.BorY;
    
    if (!this.isVive) {
      this.Y[this.Z].gesture = 
          this.Y[this.Z].gripIsActive && 
          this.Y[this.Z].thumbIsEngaged &&
          this.Y[this.Z].triggerIsActive ?
                          this.str.fist :
          this.Y[this.Z].gripIsActive && 
          this.Y[this.Z].thumbIsEngaged && 
        !this.Y[this.Z].triggerIsActive ?
                          this.str.point :
          this.Y[this.Z].gripIsActive && 
        !this.Y[this.Z].thumbIsEngaged && 
          this.Y[this.Z].triggerIsActive ?
                          this.str.thumbUp :
          this.Y[this.Z].gripIsActive && 
        !this.Y[this.Z].thumbIsEngaged && 
        !this.Y[this.Z].triggerIsActive ?
                          this.str.pistol :
          this.Y[this.Z].triggerIsActive ?
                          this.str.hold :
                          this.str.open ;
    }
    else { // Vive handling was supposedly left incomplete
      this.Y[this.Z].gesture = 
        this.Y[this.Z].gripIsActive || 
        this.Y[this.Z].triggerIsActive ?
                          this.str.fist :
        this.Y[this.Z].contact.trackpad ||
        this.Y[this.Z].contact.trackpad ?
                          this.str.point :
                          this.str.open ;
    }
  },

  emitGestureEvents() {
    this.el.emit(
      this.eventNames[this.Y[this.Z].lastGesture]?.inactive    
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
    this.Y[this.Z].clip = this.clipNameToClip[this.ANIMATIONS[this.data.gesture]];
    this.Y[this.Z].toAction = this.getMesh().mixer.clipAction(this.Y[this.Z].clip);
    this.Y[this.Z].toAction.clampWhenFinished = true;
    this.Y[this.Z].toAction.loop = THREE.LoopRepeat;
    this.Y[this.Z].toAction.repetitions = 0;
    this.Y[this.Z].toAction.timeScale = this.Y[this.Z].reverse ? -1 : 1;
    this.Y[this.Z].toAction.time = this.Y[this.Z].reverse ? this.Y[this.Z].clip.duration : 0;
    this.Y[this.Z].toAction.weight = 1;

    if (!this.Y[this.Z].lastGesture || this.data.gesture === this.Y[this.Z].lastGesture) {
      this.getMesh().mixer.stopAllAction();
      this.Y[this.Z].toAction.play();
      return;
    }

    // Animate or crossfade from gesture to gesture.
    this.Y[this.Z].clip = this.clipNameToClip[this.ANIMATIONS[this.Y[this.Z].lastGesture]];
    this.Y[this.Z].fromAction = this.getMesh().mixer.clipAction(this.Y[this.Z].clip);
    this.Y[this.Z].fromAction.weight = 0.15;
    this.Y[this.Z].fromAction.play();
    this.Y[this.Z].toAction.play();
    this.Y[this.Z].fromAction.crossFadeTo(this.Y[this.Z].toAction, 0.15, true);
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
});
