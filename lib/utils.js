'use strict'

/**
 * Format a duration between two Date objects as a mm:ss:fff string.
 * @param {Date} start
 * @param {Date} end
 * @returns {string}  e.g. "1:05:042"
 */
function getDuration (start, end) {
  const duration = new Date(end - start)
  return numPad(duration.getMinutes(), 1) + ':' + numPad(duration.getSeconds(), 2) + ':' + numPad(duration.getMilliseconds(), 3)
}

/**
 * Left-pad a number with zeros until it reaches the given minimum width.
 * Numbers wider than `size` are returned as-is (no truncation).
 * @param {number} number
 * @param {number} size   minimum character width
 * @returns {string}
 */
function numPad (number, size) {
  let result = number + ''
  while (result.length < size) {
    result = '0' + result
  }
  return result
}

module.exports = { getDuration, numPad }
