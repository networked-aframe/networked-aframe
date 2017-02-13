

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


### Avatar


### Create networked entity

`naf.entities.createNetworkEntity(template, position, rotation)`


### Send message to other clients

`naf.connection.subscribeToDataChannel(dataType, callback)`
`naf.connection.unsubscribeToDataChannel(dataType)`

`naf.connection.broadcastData(dataType, data)`
`naf.connection.broadcastDataGuaranteed(dataType, data)`
`naf.connection.sendData(toClient, dataType, data)`
`naf.connection.sendDataGuaranteed(toClient, dataType, data)`





# Dependencies

A-Frame

A-Frame Templates: https://github.com/ngokevin/kframe/tree/master/components/template

EasyRTC


# Other A-Frame networking libraries

broadcast

firebase

incheon
