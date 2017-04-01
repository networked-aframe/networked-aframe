var avatar;
var bulletSpeed = 3;

// Define custom schema for syncing avatar components
var avatarSchema = {
  template: '#avatar-template',
  components: [
    'position',
    'rotation',
    {
      selector: '.head',
      component: 'material'
    }
  ]
};
NAF.schemas.add(avatarSchema);

// Called by Networked-Aframe when connected to server
function onConnect () {
  // Get random angle
  var angleRad = Math.random()*Math.PI*2;

  // Get position around a circle
  var position = randomPointOnCircle(3, angleRad);
  var positionStr = position.x + ' 1.3 ' + position.y;

  // Get rotation towards center of circle
  var angleDeg = angleRad * 180 / Math.PI;
  var angleToCenter = -1 * angleDeg + 90;
  var rotationStr = '0 ' + angleToCenter + ' 0';

  // Create avatar with this position and rotation
  avatar = NAF.entities.createAvatar('#avatar-template', positionStr, rotationStr);

  // Detect trigger pulled (spacebar)
  document.body.onkeyup = function(e){
    if(e.keyCode == 32){
      shoot();
    }
  }
}

function shoot() {
  var tip = avatar.querySelector('.gun-tip');
  var position = tip.getAttribute('position');
  var worldDirection = new THREE.Vector3();
  tip.object3D.getWorldDirection(worldDirection);
  worldDirection.multiplyScalar(-1);

  var worldPos = new THREE.Vector3();
  worldPos.setFromMatrixPosition(tip.object3D.matrixWorld);
  var bullet = NAF.entities.createNetworkEntity('#bullet-template', worldPos, '0 0 0');

  var moveForward = function() {
    var currentPosition = bullet.getAttribute('position');
    var newPosition = worldDirection
                        .clone()
                        .multiplyScalar(bulletSpeed)
                        .add(currentPosition);
    bullet.setAttribute('position', newPosition);
  };

  NAF.utils.whenEntityLoaded(bullet, function() {
    var moveInterval = setInterval(moveForward, 100);

    var removeBullet = function() {
      clearInterval(moveInterval);
      bullet.parentElement.removeChild(bullet);
    };
    setTimeout(removeBullet, 3000);
  })
}

function randomPointOnCircle(radius, angleRad) {
  x = Math.cos(angleRad)*radius;
  y = Math.sin(angleRad)*radius;
  return {x: x, y: y};
}