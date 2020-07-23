AFRAME.registerComponent('pickupable', {
  init: function() {
    var self = this;
    self.player = document.querySelector('#player');  //this is our player/camera
    self.pickedUp = false;

    //let's give a random material color that syncs appropriately
    self.el.setAttribute('material', {flatShading:true, color:'rgb(' + Math.floor(Math.random() * 255) + ',' + Math.floor(Math.random() * 255) + ',' + Math.floor(Math.random() * 255) + ')'});

    self.el.addEventListener('click', (e) => {
        if (self.pickedUp === true) {
            //release
            self.el.sceneEl.object3D.attach(self.el.object3D); //using three's "attch" allows us to retain world transforms during pickup/release
            self.pickedUp = false;
        }
        else {
            //pick-up
            self.player.object3D.attach(self.el.object3D);
            self.pickedUp = true;

        }
    });

    //some visualuzation of interactivity as hover effects
    self.el.addEventListener('mouseenter', (e) => {
      self.el.setAttribute('scale', '1.2 1.2 1.2');
    });

    self.el.addEventListener('mouseleave', (e) => {
      self.el.setAttribute('scale', '1.0 1.0 1.0');
    });
  }
});