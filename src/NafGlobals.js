var globals = {
  appId: '',
  roomId: '',
  debug: false,
  updateRate: 15, // How often the network components call `sync`
  compressPackets: true // Compress the synced packets of network components
};

module.exports = globals;