var options = {
  debug: false,
  updateRate: 15, // How often network components call `sync`
  compressSyncPackets: false, // compress network component sync packet json
  useLerp: true, // lerp position, rotation, and scale components on networked entities.
};
module.exports = options;
