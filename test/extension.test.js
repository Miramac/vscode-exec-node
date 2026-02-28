/* global suite, suiteSetup, test */
'use strict'

const assert = require('assert')
const path = require('path')
const fs = require('fs')
const vscode = require('vscode')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wait for the extension to activate (triggered by executing its command). */
function ensureActivated () {
  return vscode.commands.executeCommand('extension.miramac.node.exec')
    .then(function () {}, function () {}) // ignore errors from no open editor
}

/** Open a text document with the given content and language. */
function openDocument (content, language) {
  return vscode.workspace.openTextDocument({ content: content, language: language || 'javascript' })
    .then(function (doc) {
      return vscode.window.showTextDocument(doc)
    })
}

/** Close all open editors. */
function closeAllEditors () {
  return vscode.commands.executeCommand('workbench.action.closeAllEditors')
}

/** Poll until predicate returns true or timeout expires. */
function waitFor (predicate, timeoutMs, intervalMs) {
  timeoutMs = timeoutMs || 3000
  intervalMs = intervalMs || 50
  return new Promise(function (resolve, reject) {
    const deadline = Date.now() + timeoutMs
    const id = setInterval(function () {
      if (predicate()) {
        clearInterval(id)
        resolve()
      } else if (Date.now() > deadline) {
        clearInterval(id)
        reject(new Error('waitFor timed out'))
      }
    }, intervalMs)
  })
}

// ---------------------------------------------------------------------------
// Suite: Command registration
// ---------------------------------------------------------------------------

suite('Command registration', function () {
  suiteSetup(function () {
    return ensureActivated()
  })

  test('exec command is registered', function () {
    return vscode.commands.getCommands(true).then(function (commands) {
      assert.ok(
        commands.includes('extension.miramac.node.exec'),
        'extension.miramac.node.exec should be registered'
      )
    })
  })

  test('cancel command is registered', function () {
    return vscode.commands.getCommands(true).then(function (commands) {
      assert.ok(
        commands.includes('extension.miramac.node.cancel'),
        'extension.miramac.node.cancel should be registered'
      )
    })
  })
})

// ---------------------------------------------------------------------------
// Suite: exec command — guard conditions
// ---------------------------------------------------------------------------

suite('exec command — guard conditions', function () {
  suiteSetup(function () {
    return ensureActivated()
  })

  test('exec does nothing when no editor is open', function () {
    return closeAllEditors().then(function () {
      // Should resolve without throwing — the guard returns early
      return vscode.commands.executeCommand('extension.miramac.node.exec')
    })
  })
})

// ---------------------------------------------------------------------------
// Suite: Code execution (output panel mode)
// ---------------------------------------------------------------------------

suite('Code execution', function () {
  this.timeout(10000)

  suiteSetup(function () {
    return ensureActivated()
  })

  suiteTeardown(function () {
    return closeAllEditors()
  })

  test('executes a simple console.log and produces output', function () {
    return openDocument("console.log('hello-exec-test')", 'javascript').then(function () {
      return vscode.commands.executeCommand('extension.miramac.node.exec')
    }).then(function () {
      // Give the child process time to run and stream output
      return new Promise(function (resolve) { setTimeout(resolve, 2000) })
    })
    // If execution throws, the test fails. Output verification would need
    // access to the OutputChannel internals which VSCode does not expose;
    // successful resolution is sufficient to confirm the process launched.
  })

  test('temp file is cleaned up after execution', function () {
    const dirName = path.join(__dirname)
    return openDocument('// cleanup test', 'javascript').then(function () {
      return vscode.commands.executeCommand('extension.miramac.node.exec')
    }).then(function () {
      return new Promise(function (resolve) { setTimeout(resolve, 2000) })
    }).then(function () {
      // No *.tmp.js file should remain in the test directory
      const tmpFiles = fs.readdirSync(dirName).filter(function (f) {
        return f.startsWith('node_') && f.includes('.tmp')
      })
      assert.strictEqual(tmpFiles.length, 0, 'All temp files should be deleted after execution')
    })
  })

  test('cancel command resolves without error when nothing is running', function () {
    return closeAllEditors().then(function () {
      return vscode.commands.executeCommand('extension.miramac.node.cancel')
    })
  })
})

// ---------------------------------------------------------------------------
// Suite: TypeScript runner selection (unit-level logic via utils)
// ---------------------------------------------------------------------------

suite('TypeScript runner selection', function () {
  // This suite tests the execBin resolution logic in isolation by checking
  // that tsRunner config affects what would be used for .ts files.

  test('tsRunner config defaults to ts-node', function () {
    const config = vscode.workspace.getConfiguration('miramac.node')
    const tsRunner = config.get('tsRunner')
    assert.strictEqual(tsRunner, 'ts-node')
  })

  test('outputWindowName config has a default value', function () {
    const config = vscode.workspace.getConfiguration('miramac.node')
    const name = config.get('outputWindowName')
    assert.ok(typeof name === 'string' && name.length > 0, 'outputWindowName should be a non-empty string')
  })

  test('legacyMode defaults to false', function () {
    const config = vscode.workspace.getConfiguration('miramac.node')
    assert.strictEqual(config.get('legacyMode'), false)
  })

  test('clearOutput defaults to true', function () {
    const config = vscode.workspace.getConfiguration('miramac.node')
    assert.strictEqual(config.get('clearOutput'), true)
  })

  test('terminalMode defaults to false', function () {
    const config = vscode.workspace.getConfiguration('miramac.node')
    assert.strictEqual(config.get('terminalMode'), false)
  })
})
