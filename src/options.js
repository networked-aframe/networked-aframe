var options = {
  debug: false,
  updateRate: 15, // How often network components call `sync`
  useLerp: true, // lerp position, rotation, and scale components on networked entities.
  ignoreUnreliableFirstSyncs: false, // Set to true if you want to ignore first sync updates from unreliable channels.
};
module.exports = options;
