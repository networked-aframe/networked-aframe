var globals = {
  app: '',
  room: '',
  clientId: '',
  debug: false,
  updateRate: 15, // How often network components call `sync`
  compressSyncPackets: false // compress network component sync packet json
};

module.exports = globals;