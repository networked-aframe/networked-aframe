var options = {
  debug: false,
  updateRate: 15, // How often network components call `sync`
  compressSyncPackets: false, // compress network component sync packet json
  useLerp: true, // when networked entities are created the aframe-lerp-component is attached to the root
};
module.exports = options;
