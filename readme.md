






# API

### Scene setup

<a-scene network-scene="...">

appId: {default: 'default'},
roomId: {default: 'default'},
connectOnLoad: {default: true},
signallingUrl: {type: 'string'},
audio: {default: false},
avatar: {default: true},
debug: {default: false}


### Create networked entity

`naf.entities.createNetworkEntity(template, position, rotation)`


### Send message

`naf.connection.subscribeToDataChannel(dataType, callback)`
`naf.connection.unsubscribeToDataChannel(dataType)`

`naf.connection.broadcastData(dataType, data)`
`naf.connection.broadcastDataGuaranteed(dataType, data)`
`naf.connection.sendData(toClient, dataType, data)`
`naf.connection.sendDataGuaranteed(toClient, dataType, data)`

`naf.connection.isConnectedTo(client)`






# Dependencies

A-Frame

A-Frame Templates: https://github.com/ngokevin/kframe/tree/master/components/template

EasyRTC
