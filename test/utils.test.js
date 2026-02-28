/* global suite, test */
'use strict'

const assert = require('assert')
const { getDuration, numPad } = require('../lib/utils')

// ---------------------------------------------------------------------------
// numPad
// ---------------------------------------------------------------------------

suite('numPad', function () {
  test('returns number unchanged when already at minimum width', function () {
    assert.strictEqual(numPad(12, 2), '12')
  })

  test('pads a single digit to width 2', function () {
    assert.strictEqual(numPad(5, 2), '05')
  })

  test('pads zero to width 3 (milliseconds column)', function () {
    assert.strictEqual(numPad(0, 3), '000')
  })

  test('pads 42 to width 3', function () {
    assert.strictEqual(numPad(42, 3), '042')
  })

  test('does not truncate a number wider than size', function () {
    assert.strictEqual(numPad(1234, 2), '1234')
  })

  test('pads to width 1 (minutes column — never actually pads)', function () {
    assert.strictEqual(numPad(0, 1), '0')
    assert.strictEqual(numPad(9, 1), '9')
  })
})

// ---------------------------------------------------------------------------
// getDuration
// ---------------------------------------------------------------------------

suite('getDuration', function () {
  test('zero duration formats as 0:00:000', function () {
    const t = new Date(0)
    assert.strictEqual(getDuration(t, t), '0:00:000')
  })

  test('500ms formats as 0:00:500', function () {
    assert.strictEqual(getDuration(new Date(0), new Date(500)), '0:00:500')
  })

  test('1 second formats as 0:01:000', function () {
    assert.strictEqual(getDuration(new Date(0), new Date(1000)), '0:01:000')
  })

  test('1 second 500ms formats as 0:01:500', function () {
    assert.strictEqual(getDuration(new Date(0), new Date(1500)), '0:01:500')
  })

  test('1 minute formats as 1:00:000', function () {
    assert.strictEqual(getDuration(new Date(0), new Date(60000)), '1:00:000')
  })

  test('1 minute 5 seconds 42ms formats as 1:05:042', function () {
    assert.strictEqual(getDuration(new Date(0), new Date(65042)), '1:05:042')
  })

  test('59 seconds 999ms formats as 0:59:999', function () {
    assert.strictEqual(getDuration(new Date(0), new Date(59999)), '0:59:999')
  })

  test('result always matches the m+:ss:fff pattern', function () {
    const cases = [0, 7, 1234, 65042, 599999]
    cases.forEach(function (ms) {
      const result = getDuration(new Date(0), new Date(ms))
      assert.match(result, /^\d+:\d{2}:\d{3}$/, `failed for ${ms}ms: got "${result}"`)
    })
  })

  test('seconds column is always 2 digits', function () {
    // 5 seconds -> "05", not "5"
    const result = getDuration(new Date(0), new Date(5000))
    const parts = result.split(':')
    assert.strictEqual(parts[1].length, 2)
  })

  test('milliseconds column is always 3 digits', function () {
    // 7ms -> "007", not "7"
    const result = getDuration(new Date(0), new Date(7))
    const parts = result.split(':')
    assert.strictEqual(parts[2].length, 3)
  })
})
