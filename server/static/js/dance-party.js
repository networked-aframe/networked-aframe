// Define custom schema for syncing avatar components
var avatarSchema = {
  template: '#avatar-template',
  components: [
    'position',
    'rotation',
    {
      selector: '.head',
      component: 'material'
    },
    {
      selector: '.hairs',
      component: 'show-child'
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
  var avatar = NAF.entities.createAvatar('#avatar-template', positionStr, rotationStr);

  // Set random hair style after avatar has loaded... yuck... TODO remove setTimeout
  setTimeout(function() {
    var r = getRandomInt(0, 2);
    avatar.querySelector('.hairs').setAttribute('show-child', r);
  }, 100);
}

function randomPointOnCircle(radius, angleRad) {
  x = Math.cos(angleRad)*radius;
  y = Math.sin(angleRad)*radius;
  return {x: x, y: y};
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}