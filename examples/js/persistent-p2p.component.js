/* global AFRAME, NAF */
AFRAME.registerComponent('persistent-p2p', {

  init: function() {
    this.onConnected = this.onConnected.bind(this);
    this.sendPersistentEntityCreated = this.sendPersistentEntityCreated.bind(this);

    if (NAF.clientId) {
      this.onConnected();
    } else {
      document.body.addEventListener('connected', this.onConnected, false);
    }
  },

  onConnected: function() {
    const receiveData = (_senderId, _dataType, data) => {
      if (data.eventType === 'persistentEntityCreated') {
        const el = document.createElement('a-entity');
        this.el.sceneEl.appendChild(el);
        el.setAttribute('networked', {
            networkId: data.networkId,
            template: data.template,
            persistent: true,
            owner: 'scene'
        });
        // If we receive a {persistent: true, isFirstSync: true} NAF `u` message before the
        // persistentEntityCreated message, the NAF message is stored in
        // NAF.entities._persistentFirstSyncs waiting the entity to be created.
        // After creating the entity like we just did above, we need to call
        // applyPersistentFirstSync to consume the received data to really
        // initialize the networked component, otherwise it won't show.
        NAF.utils.getNetworkedEntity(el).then((networkedEl) => {
          networkedEl.components.networked.applyPersistentFirstSync();
        });
      }
    }

    NAF.connection.subscribeToDataChannel('events', receiveData);

    // The persistentEntityCreated event is emitted by the spawner-persistent component.
    // Broadcast a persistentEntityCreated message to everyone in the room.
    document.body.addEventListener('persistentEntityCreated', this.sendPersistentEntityCreated, false);

    // Note that when a participant leave the room, the other participants take ownership of the persistent entities of the left participant,
    // see the code in the NetworkEntities.removeEntitiesOfClient function for details.

    // When a new participant enter the room, send the persistentEntityCreated
    // message for each persistent entity I own.
    // Sending the networked data are done by NAF already with the same logic.
    document.body.addEventListener('clientConnected', (evt) => {
      const targetClientId = evt.detail.clientId;
      for (let id in NAF.entities.entities) {
        if (NAF.entities.entities[id]) {
          const networkedComponent = NAF.entities.entities[id].components.networked;
          const networkedData = networkedComponent.data;
          if (networkedData.persistent && networkedData.owner && networkedComponent.isMine()) {
            const data = {
              eventType: 'persistentEntityCreated',
              networkId: networkedData.networkId,
              template: networkedData.template
            };
            NAF.connection.sendDataGuaranteed(targetClientId, 'events', data);
          }
        }
      }
    });

    document.body.removeEventListener('connected', this.onConnected, false);
  },

  sendPersistentEntityCreated: function(evt) {
    const el = evt.detail.el;
    NAF.utils.getNetworkedEntity(el).then((networkedEl) => {
      if (NAF.connection.isConnected()) {
        const networkedData = networkedEl.components.networked.data;
        const data = {
          eventType: 'persistentEntityCreated',
          networkId: networkedData.networkId,
          template: networkedData.template
        };
        NAF.connection.broadcastDataGuaranteed('events', data);
      }
    });
  }
});


