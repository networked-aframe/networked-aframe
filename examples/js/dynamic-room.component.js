/* global AFRAME */
/**
 * Setup the Networked-Aframe scene component based on query parameters
 */
AFRAME.registerComponent('dynamic-room', {
  init: function () {
    const el = this.el;
    const params = new URLSearchParams(location.search);
    const room = params.get('room');

    if (!room) {
      window.alert('Please add a room name in the URL, eg. ?room=myroom and to enable audio add &audio=true');
      return;
    }

    const audio = params.get('audio') === 'true';
    const adapter = audio ? 'easyrtc' : 'wseasyrtc';
        
    const networkedComp = { room, adapter, audio };
    console.info('Init networked-aframe with settings:', networkedComp);
    el.setAttribute('networked-scene', networkedComp);
  }
});
