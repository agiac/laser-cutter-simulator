/**
 * @typedef {{x: number, y: number}} VectorType
 */

/**
 * @param {number} x
 * @param {number} y
 */
function Vector(x, y) {
  this.x = x;
  this.y = y;
}

Vector.prototype.negate = function() {
  return new Vector(-this.x, -this.y);
};

/**
 * @param {VectorType} vector
 */
Vector.prototype.add = function({ x, y }) {
  return new Vector(this.x + x, this.y + y);
};

/**
 * @param {VectorType} vector
 */
Vector.prototype.sub = function({ x, y }) {
  return new Vector(this.x - x, this.y - y);
};

Vector.prototype.mag = function() {
  return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
};

Vector.prototype.unit = function() {
  const mag = this.mag();
  return new Vector(this.x / mag || this.x, this.y / mag || this.y);
};

/**
 * @param {number} s
 */
Vector.prototype.scale = function(s) {
  return new Vector(this.x * s, this.y * s);
};

/**
 * @param {number} max
 */
Vector.prototype.limit = function(max) {
  if (this.mag() > max) {
    return this.unit().scale(max);
  }
  return new Vector(this.x, this.y);
};

/**
 * @param {VectorType} vector
 */
Vector.prototype.cross = function({ x, y }) {
  return this.x * y - this.y * x;
};

/**
 * @param {VectorType} vector
 */
Vector.prototype.dot = function({ x, y }) {
  return this.x * x + this.y * y;
};

export default Vector;