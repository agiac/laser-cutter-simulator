function Vector(x, y) {
  this.x = x;
  this.y = y;
}

Vector.prototype.negate = function() {
  return new Vector(-this.x, -this.y);
};

Vector.prototype.add = function({ x, y }) {
  return new Vector(this.x + x, this.y + y);
};

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

Vector.prototype.scale = function(s) {
  return new Vector(this.x * s, this.y * s);
};

Vector.prototype.limit = function(max) {
  if (this.mag() > max) {
    return this.unit().scale(max);
  }
  return new Vector(this.x, this.y);
};

Vector.prototype.cross = function({ x, y }) {
  return new Vector(this.x * y - this.y * x);
};

Vector.prototype.dot = function({ x, y }) {
  return new Vector(this.x * x + this.y * y);
};

export default Vector;
