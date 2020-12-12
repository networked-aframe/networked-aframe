/* global NAF, Croquet, AFRAME, THREE, SimplePeer */

/**
 * Croquet Adapter (croquet)
*/

var NoOpAdapter = require('./NoOpAdapter')

if (window.Croquet) {
    class Model extends Croquet.Model {
        init() {
            super.init()
    
            this.clients = {}
            this.subscribe(this.sessionId, 'view-join', this.onViewJoin)
            this.subscribe(this.sessionId, 'view-exit', this.onViewExit)
    
            this.subscribe(this.sessionId, 'broadcast', this.onBroadcast)
            this.subscribe(this.sessionId, 'send', this.onSend)

            this.subscribe(this.sessionId, 'client-ready', this.onClientReady)
        }
    
        static types () {
            return {
                'THREE.Vector3' : THREE.Vector3,
            }
        }
        
        onViewJoin (viewId) {
            this.clients[viewId] = {
                joinTime: this.now(),
                isReady: false,
            }
            this.publish(this.sessionId, 'client-join', viewId)
            this.publish(viewId, 'client-join')
        }
        onViewExit (viewId) {
            delete this.clients[viewId]
            this.publish(this.sessionId, 'client-exit', viewId)
        }
    
        onBroadcast (packet) {
            this.publish(this.sessionId, 'did-broadcast', packet)
        }
        onSend (packet) {
            this.publish(packet.to, 'did-send', packet)
        }

        onClientReady (viewId) {
            if (this.clients[viewId] && !this.clients[viewId].isReady) {
                this.clients[viewId].isReady = true
                this.publish(this.sessionId, 'client-is-ready', viewId)
            }
        }
    }
    Model.register('Model')
    
    class View extends Croquet.View {
        constructor (model) {
            super(model)
            this.model = model
        }

        get myClient () {
            return this.model.clients[this.viewId]
        }
    
        get myRoomJoinTime () {
            return this.myClient?
                this.myClient.joinTime:
                null
        }

        get isReady () {
            return this.myClient?
                this.myClient.isReady:
                null
        }
    
        broadcast (packet) {
            this.publish(this.sessionId, 'broadcast', packet)
        }
        
        send (packet) {
            this.publish(this.sessionId, 'send', packet)
        }
    }
    
    class CroquetAdapter {
        constructor () {
            if (Croquet === undefined) {
                console.warn('The Croquet SDK has not been added. Add it by including <script src="https://croquet.io/sdk/croquet-latest-pre.min.js"></script>')
            }
    
            this.app = 'default'
            this.room = 'default'
    
            this.streams = {}
            this.peers = {}
            this.pendingStreamRequest = {}
        }
    
        get myId () {
            return this.session?
                this.session.view.viewId:
                null
        }

        get isReady () {
            return this.session?
                this.session.view.isReady:
                false
        }

        get myStream () {
            return this.streams[this.myId]
        }

        get usePeers () {
            return this.room.startsWith('!')
        }

        get clients () {
            return this.session?
                this.session.model.clients:
                {}
        }
    
        get myRoomJoinTime () {
            return this.session.view.myRoomJoinTime
        }
    
        get occupants () {
            const occupants = {}
            if (this.clients) {
                for (const viewId in this.clients) {
                    if (this.clients[viewId].isReady) {
                        occupants[viewId] = this.clients[viewId].joinTime
                    }
                }
            }
            return occupants
        }
        get connectedClients () {
            const connectedClients = Object.keys(this.occupants)
            NAF.log.write("getting connected clients", connectedClients)
            return connectedClients
        }
    
        setServerUrl () {
    
        }
        setApp (app) {
            this.app = app
        }
        setRoom (room) {
            this.room = room
        }
    
        setWebRtcOptions(options) {
            if (options.audio === true) {
                this.sendAudio = true
            }
            if (options.video === true) {
                this.sendVideo = true
            }
        }
    
        setServerConnectListeners(successListener, failureListener) {
            this.connectSuccess = successListener
            this.connectFailure = failureListener
        }
        
        setRoomOccupantListener(occupantListener) {
            this.occupantListener = occupantListener
        }
        
        setDataChannelListeners(openListener, closedListener, messageListener) {
            this.openListener = openListener
            this.closedListener = closedListener
            this.messageListener = messageListener
        }
    
        connect () {
            NAF.log.write("Attempting to connect to croquet")
    
            new Promise((resolve, reject) => {
                if (this.session) {
                    this.session.leave().then(() => resolve()).catch(error => reject(error))
                }
                else {
                    resolve()
                }
            }).then(() => {
                Croquet.Session.join({
                    appId: `Networked.AFrame.${this.app}`,
                    name: this.room,
                    password: 'password',
                    model: Model,
                    view: View,
                    autoSleep: false,
                }).then(session => {
                    this.session = session
                    window.session = session
    
                    new Promise((resolve, reject) => {
                        if (typeof this.myRoomJoinTime === 'number') {
                            resolve()
                        }
                        else {
                            this.session.view.subscribe(this.session.view.viewId, 'client-join', () => {
                                resolve()
                            })
                        }
                    }).then(() => {
                        return new Promise((resolve, reject) => {
                            if (this.usePeers && (this.sendAudio || this.sendVideo)) {
                                navigator.mediaDevices.getUserMedia({
                                    video: AFRAME.utils.device.checkHeadsetConnected()?
                                        false:
                                        this.sendVideo,
                                    audio: this.sendAudio,
                                }).then(localStream => {
                                    this.streams[this.myId] = localStream
                                    resolve()
                                }).catch(error => {
                                    NAF.log.error(error)
                                    console.error("Microphone is disabled due to lack of permissions")
                                    this.sendAudio = this.sendVideo = false
                                    resolve()
                                })
                            }
                            else {
                                resolve()
                            }
                        })
                    }).then(() => {
                        this.session.view.subscribe(this.session.id, 'client-is-ready', viewId => {
                            if (viewId === this.myId) {
                                this.session.view.subscribe(this.session.id, 'did-broadcast', packet => {
                                    const {from, type, data} = packet
                                    this.messageListener(from, type, data)
                                })
            
                                this.session.view.subscribe(this.session.view.viewId, 'did-send', packet => {
                                    const {from, type} = packet
                                    let {data} = packet
                                    if (type === 'simple-peer') {
                                        if (this.usePeers) {
                                            if (!this.peers[from]) {
                                                data = JSON.parse(data)
                                                this.createPeer({to: from, data})
                                            }
                                            this.peers[from].signal(data)
                                        }
                                    }
                                    else {
                                        this.messageListener(from, type, data)
                                    }
                                })

                                this.session.view.subscribe(this.session.id, 'client-exit', viewId => {
                                    this.closedListener(viewId)
                                    this.receivedOccupants()
                                })
                                
                                NAF.log.write("User connected", this.myId)
                                NAF.log.write("Successfully joined room", this.room, "at server time", this.myRoomJoinTime)
                                this.connectSuccess(this.myId)
                                this.receivedOccupants()
                            }
                            else {
                                if (this.isReady) {
                                    this.openListener(viewId)
                                    this.receivedOccupants()
                                }
                            }
                        })

                        this.session.view.publish(this.session.id, 'client-ready', this.session.view.viewId)
                    })
                })
            })
        }
    
        receivedOccupants () {
            const occupants = {}
            for (const viewId in this.occupants) {
                if (viewId !== this.myId) {
                    occupants[viewId] = this.occupants[viewId]
                }
            }
            NAF.log.write('occupants changed', occupants)
            this.occupantListener(occupants)
        }

        shouldStartConnectionTo(viewId) {
            return true
        }
    
        startStreamConnection (viewId) {
            NAF.log.write('starting offer process')
            if (this.usePeers) {
                this.createPeer({initiator: true, to: viewId})
            }
            else {
                this.openListener(viewId)
            }
        }

        createPeer ({initiator, to, data}) {
            console.log('about to create peer')
            const peer = new SimplePeer({
                initiator,

                trickle: false,
                stream: this.myStream,

                offerToReceiveAudio: true,
            })
            console.log('created peer', peer)

            peer.on('connect', () => {
                this.openListener(to)
            })
            peer.on('disconnect', () => {
                this.closedListener(to)
            })
            peer.on('stream', stream => {
                this.storeStream(to, stream)
            })

            let haventSent = true
            peer.on('signal', data => {
                if (haventSent) {
                    this.sendData(to, 'simple-peer', JSON.stringify(data))
                    haventSent = false
                }
            })

            if (!initiator) {
                peer.signal(data)
            }
            
            this.peers[to] = peer
        }
        
        closeStreamConnection (viewId) {
            NAF.log.write('closeStreamConnection', viewId, this.peers)
            if (this.usePeers) {
                const peer = this.peers[viewId]
                if (peer) {
                    peer.destroy()
                    delete this.peers[viewId]
                }
            }
            this.closedListener(viewId)
        }
    
        getConnectStatus (viewId) {
            if (this.usePeers) {
                if (typeof this.occupants[viewId] === 'number') {
                    const peer = this.peers[viewId]
                    if (peer) {
                        if (peer) {
                            return peer.connected?
                                NAF.adapters.NOT_CONNECTED:
                                NAF.adapters.CONNECTING
                        }
                        else {
                            return NAF.adapters.NOT_CONNECTED
                        }
                    }
                    else {
                        return NAF.adapters.NOT_CONNECTED
                    }
                }
                else {
                    return NAF.adapters.NOT_CONNECTED
                }
            }
            else {
                return (typeof this.occupants[viewId] === 'number')?
                    NAF.adapters.IS_CONNECTED:
                    NAF.adapters.NOT_CONNECTED
            }
        }
    
        sendData(to, type, data) {
            this.sendDataGuaranteed(to, type, data)
        }
        sendDataGuaranteed(to, type, data) {
            const packet = {
                from: this.myId,
                to,
                type,
                data,
                sending: true,
            }
        
            if (this.session) {
                this.session.view.send(packet)
            } else {
                NAF.log.warn('Croquet Session not created yet')
            }
        }
    
        broadcastData(type, data) {
            this.broadcastDataGuaranteed(type, data)
        }
        broadcastDataGuaranteed(type, data) {
            const packet = {
                from: this.myId,
                type,
                data,
                broadcasting: true,
            }
        
            if (this.session) {
                this.session.view.broadcast(packet)
            } else {
                NAF.log.warn('Croquet Session not created yet')
            }
        }
        
        storeStream (viewId, stream) {
            this.streams[viewId] = stream
            if (this.pendingStreamRequest[viewId]) {
                NAF.log.write("Received pending stream for " + viewId)
                this.pendingStreamRequest[viewId](stream)
                delete this.pendingStreamRequest[viewId](stream)
            }
        }
        getMediaStream(viewId) {
            if (this.usePeers) {
                if (this.streams[viewId]) {
                    NAF.log.write("Already had stream for " + viewId)
                    return Promise.resolve(this.streams[viewId])
                }
                else {
                    NAF.log.write("Waiting on stream for " + viewId)
                    return new Promise(resolve => {
                        this.pendingStreamRequest[viewId] = resolve
                    })
                }
            }
        }
    
        getServerTime () {
            return this.session?
                this.session.view.now():
                0
        }
    
        disconnect() {
            if (this.session) {
                this.session.leave()
                delete this.session
            }
        }
    }
    module.exports = CroquetAdapter
}
else {
    module.exports = NoOpAdapter
}