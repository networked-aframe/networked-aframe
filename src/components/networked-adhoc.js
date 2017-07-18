var naf = require('../NafIndex');

AFRAME.registerComponent('networked-adhoc', {
  schema: {
    physics: {default: false},
    networkId: {default: ''},
    components: {default: ''},
  },
  init: function () { addNetEntityFromElement(this.el, this.data.networkId, this.data); }
});

function addNetEntityFromElement(el, networkId, data) {
  if (!networkId) { networkId = Math.random().toString(36).substring(2, 9); }

  // make an inline data URI template from the given element

  el.flushToDOM(); // assume this is synchronous
  var n = el.cloneNode(true); // make a copy
  [ 'id',
    'camera', 'look-controls', 'wasd-controls',
    // 'position', 'rotation',
    'networked', 'networked-share', 'networked-remote', 'networked-adhoc',
    'dynamic-body', // 'static-body',
    'quaternion', 'velocity',
  ].forEach(function (name) { n.removeAttribute(name); });

  var template = NAF.options.compressSyncPackets
    ? ('data:text/html;charset=utf-8;base64,' + btoa(n.outerHTML))
    : ('data:text/html;charset=utf-8,' + encodeURIComponent(n.outerHTML))

  //el.setAttribute('id', 'naf-' + networkId);
  el.setAttribute('networked-share', {
    physics: data.physics,
    template: template,
    components: data.components,
    showLocalTemplate: false,
    networkId: networkId,
    // this is default now... owner: NAF.clientId // we own it to start
  });

  return el;
}

