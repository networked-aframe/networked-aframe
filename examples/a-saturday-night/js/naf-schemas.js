var headSchema = {
  template: '#head-template',
  components: [
    'position',
    'rotation',
    'show-child'
  ]
};
NAF.schemas.add(headSchema);

var leftHandSchema = {
  template: '#left-hand-template',
  components: [
    'position',
    'rotation',
    'visible',
    'show-child'
  ]
};
NAF.schemas.add(leftHandSchema);

var rightHandSchema = {
  template: '#right-hand-template',
  components: [
    'position',
    'rotation',
    'visible',
    'show-child'
  ]
};
NAF.schemas.add(rightHandSchema);

var playerTemplate = {
  template: '#player-template',
  components: [
    'position',
    'rotation'
  ]
};
NAF.schemas.add(playerTemplate);