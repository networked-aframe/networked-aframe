var globals = {
  appId: '',
  roomId: '',
  debug: false,
  updateRate: 15, // How often network components call `sync`
  compressSyncPackets: true // compress network component sync packet json
};

module.exports = globals;