var naf = require('../NafIndex');

AFRAME.registerComponent('networked-adhoc', {
  schema: {default: ''},
  init: function () { addNetEntityFromElement(this.el, this.data); }
});

function addNetEntityFromElement(el, networkId) {
  if (!networkId) { networkId = Math.random().toString(36).substring(2, 9); }

  // make an inline data URI template from the given element

  el.flushToDOM(); // assume this is synchronous
  var n = el.cloneNode(); // make a copy
  [ 'id',
    'position', 'rotation',
    'networked', 'networked-share', 'networked-remote', 'networked-adhoc',
    // 'dynamic-body', 'static-body',
    'quaternion', 'velocity',
  ].forEach(function (name) { n.removeAttribute(name); });

  var template = NAF.options.compressSyncPackets
    ? ('data:text/html;charset=utf-8;base64,' + btoa(n.outerHTML))
    : ('data:text/html;charset=utf-8,' + encodeURIComponent(n.outerHTML))

  //el.setAttribute('id', 'naf-' + networkId);
  el.setAttribute('networked-share', {
    physics: true,
    template: template,
    showLocalTemplate: false,
    networkId: networkId,
    // this is default now... owner: NAF.clientId // we own it to start
  });

  return el;
}

