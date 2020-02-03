const Vector = Object.freeze({
  x: 0,
  y: 0,
  /**
   *
   * @returns {Vector}
   */
  new(x, y) {
    return { ...Vector, x, y };
  },
  /**
   *
   * @returns {Vector}
   */
  negate() {
    return this.new(-this.x, -this.y);
  },
  /**
   *
   * @returns {Vector}
   */
  add({ x, y }) {
    return this.new(this.x + x, this.y + y);
  },
  /**
   *
   * @returns {Vector}
   */
  sub({ x, y }) {
    return this.new(this.x - x, this.y - y);
  },
  /**
   *
   * @returns {Number}
   */
  mag() {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
  },
  /**
   * @returns {Vector}
   */
  unit() {
    const mag = this.mag();
    return this.new(this.x / mag || this.x, this.y / mag || this.y);
  },
  /**
   * @returns {Vector}
   */
  scale(s) {
    return this.new(this.x * s, this.y * s);
  },
  /**
   * @returns {Vector}
   */
  limit(max) {
    if (this.mag() > max) {
      return this.unit().scale(max);
    }
    return this.new(this.x, this.y);
  }
});

export default Vector;
