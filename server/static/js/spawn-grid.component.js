/**
 * Creates a grid of entities based on the given template
 * Place at the center of the grid you wish to create
 * Requires aframe-template-component
 */
AFRAME.registerComponent('spawn-grid', {
  schema: {
    clone: {type: 'string'},
    rows: {default: 2},
    rowSeparation: {default: 2},
    columns: {default: 2},
    columnSeparation: {default: 2}
  },

  init: function() {
    this.clone = document.querySelector(this.data.clone);
    var y = this.el.getAttribute('position').y;
    for (var i = 0; i < this.data.rows; i++) {
      var z = i * this.data.rowSeparation - (this.data.rowSeparation * this.data.rows / 2) + this.data.rowSeparation / 2;
      for (var j = 0; j < this.data.columns; j++) {
        var x = j * this.data.columnSeparation - (this.data.columnSeparation * this.data.columns / 2) + this.data.columnSeparation / 2;
        this.spawnEntity(i, j, x, y, z);
      }
    }
  },

  spawnEntity: function(row, col, x, y, z) {
    var cloned = this.clone.cloneNode(false);
    this.el.appendChild(cloned);

    var id = cloned.getAttribute('id');
    var newId = id + '-' + row + '-'+ col;
    cloned.setAttribute('id', newId);

    var position = x + ' ' + y + ' ' + z;
    cloned.setAttribute('position', position);

    cloned.setAttribute('visible', true);
  }
});