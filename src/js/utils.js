/**
 * @param {number} n 
 * @param {number} precision 
 * @returns {number}
 */
export function isZero(n, precision = 0.000001) {
  if (Math.abs(n) < precision) return 0;
  return n;
}

/**
 * @param {number} a 
 * @param {number} b 
 * @param {number} precision 
 * @returns {boolean}
 */
export function approxEqual(a, b, precision = 0.000001) {
  return Math.abs(a - b) <= precision;
}

/**
 * @param {number} a 
 * @param {number} b 
 * @param {number} precision 
 * @returns {boolean}
 */
export function approxGreater(a, b, precision = 0.000001) {
  return a - b > precision;
}

/**
 * @param {number} a 
 * @param {number} b 
 * @param {number} precision 
 * @returns {boolean}
 */
export function approxGreateOrEqual(a, b, precision = 0.000001) {
  return approxGreater(a, b, precision) || approxEqual(a, b, precision);
}