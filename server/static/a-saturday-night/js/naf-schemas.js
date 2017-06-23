var headSchema = {
  template: '#head-template',
  components: [
    'position',
    'rotation',
    {
      selector: '.heads',
      component: 'show-child'
    }
  ]
};
NAF.schemas.add(headSchema);

var leftHandSchema = {
  template: '#left-hand-template',
  components: [
    'position',
    'rotation',
    'visible',
    {
      selector: '.hands',
      component: 'show-child'
    }
  ]
};
NAF.schemas.add(leftHandSchema);

var rightHandSchema = {
  template: '#right-hand-template',
  components: [
    'position',
    'rotation',
    'visible',
    {
      selector: '.hands',
      component: 'show-child'
    }
  ]
};
NAF.schemas.add(rightHandSchema);

