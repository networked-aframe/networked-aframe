class ChildEntityCache {

  constructor() {
    this.dict = {};
  }

  addChild(parentNetworkId, childData) {
    if (!this.hasParent(parentNetworkId)) {
      this.dict[parentNetworkId] = [];
    }
    this.dict[parentNetworkId].push(childData);
  }

  getChildren(parentNetworkId) {
    if (!this.hasParent(parentNetworkId)) {
      return [];
    }
    var children = this.dict[parentNetworkId];
    delete this.dict[parentNetworkId];
    return children;
  }

  /* Private */
  hasParent(parentId) {
    return this.dict.hasOwnProperty(parentId)
  }
}
module.exports = ChildEntityCache;