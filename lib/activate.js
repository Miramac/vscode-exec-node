'use strict'
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode')
const spawn = require('child_process').spawn
const spawnSync = require('child_process').spawnSync
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { getDuration } = require('./utils')

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

function activate (context) {
  // PTY-based terminal — reused across runs, lives in the TERMINAL panel,
  // supports full ANSI colors and Ctrl+C cancellation.
  const writeEmitter = new vscode.EventEmitter()
  let execTerminal = null
  let childProcess
  let runningStatus = null

  const terminalPty = {
    onDidWrite: writeEmitter.event,
    open: () => {},
    close: () => { execTerminal = null },
    // Ctrl+C inside the terminal panel cancels the running process
    handleInput: (data) => {
      if (data === '\x03' && childProcess) {
        childProcess.kill()
      }
    }
  }

  function getTerminal () {
    if (!execTerminal) {
      const name = vscode.workspace.getConfiguration('miramac.node').get('outputWindowName')
      execTerminal = vscode.window.createTerminal({ name, pty: terminalPty })
    }
    return execTerminal
  }

  // Write a line to the PTY terminal (\r\n required for terminal line endings)
  function writeLine (text) {
    writeEmitter.fire(text.replace(/\r?\n/g, '\r\n') + '\r\n')
  }

  // Write raw text to the PTY terminal (for streaming stdout chunks)
  function write (text) {
    writeEmitter.fire(text.replace(/\r?\n/g, '\r\n'))
  }

  // Legacy terminal-mode tracking (terminalMode: true sends shell commands to a new terminal)
  const terminals = []

  // executes JS code with node
  const run = vscode.commands.registerCommand('extension.miramac.node.exec', function () {
    const config = vscode.workspace.getConfiguration('miramac.node')
    // test for running process
    if (runningStatus) {
      vscode.window.showErrorMessage('Process is already running!')
      return
    }

    const editor = vscode.window.activeTextEditor
    if (!editor) {
      return // No open text editor
    }

    const dirName = path.dirname(editor.document.fileName)
    const extName = path.extname(editor.document.fileName) || '.js'
    if (!dirName || dirName === '' || dirName === '.') {
      vscode.window.showWarningMessage('Unknown working directory! Try to save the file before running.')
      return
    }

    const selection = editor.selection
    let text = editor.document.getText(selection)
    if ((text === '' && config.executeFileOrSelection === 'both') || config.executeFileOrSelection === 'file') {
      text = editor.document.getText()
    }
    if (config.includeCode) {
      text = config.includeCode.replace('${execPath}', dirName) + ';\n' + text // eslint-disable-line no-template-curly-in-string
    }

    // get config params object
    const options = {}
    if (config.env) {
      options.env = config.env
    }
    // get cwd from config, replace placeholder and add it to the params object
    options.cwd = (typeof config.cwd === 'string') ? config.cwd.replace('${execPath}', dirName) : dirName // eslint-disable-line no-template-curly-in-string

    // set tempfile
    const tmpFile = path.join(dirName, `node_${crypto.createHash('sha1').update(Math.random().toString()).digest('hex').substr(0, 13)}.tmp${extName}`)
    // write code to temp file and exec the file with node
    fs.writeFileSync(tmpFile, text)

    let args = [tmpFile]
    if (Array.isArray(config.args) && config.args.length > 0) {
      args = args.concat(config.args)
    }

    if (Array.isArray(config.options) && config.options.length > 0) {
      args = config.options.concat(args)
    }

    // resolve the node binary path; only call spawnSync when nodeBin is not explicitly set
    const startTime = new Date()
    let nodeBin = config.nodeBin
    if (typeof nodeBin !== 'string' || nodeBin === 'node') {
      const nodePath = spawnSync('node', ['-p', 'process.execPath'])
      nodeBin = (nodePath.stdout) ? nodePath.stdout.toString().trim() : 'node'
    }

    // for TypeScript files (.ts / .tsx) use ts-node (or configured tsRunner) instead of node
    const tsExtensions = ['.ts', '.tsx']
    const execBin = tsExtensions.includes(extName)
      ? ((typeof config.tsRunner === 'string' && config.tsRunner) ? config.tsRunner : 'ts-node')
      : nodeBin

    if (!config.terminalMode) {
      const terminal = getTerminal()
      terminal.show(true)

      if (config.clearOutput) {
        // ANSI: erase display + scrollback, move cursor to top-left
        writeEmitter.fire('\x1b[2J\x1b[3J\x1b[H')
      }
      if (config.showInfo) {
        writeLine('\x1b[2m▶  Started at ' + startTime.toLocaleTimeString() + '\x1b[0m')
      }

      runningStatus = vscode.window.setStatusBarMessage('$(sync~spin) Running...')

      // spawn new node.js process
      childProcess = spawn(execBin, args, options)

      // process event handlers
      childProcess.stdout.on('data', function (data) {
        if (config.showStdout) write(data.toString())
      })
      childProcess.stderr.on('data', function (data) {
        if (config.showStderr) write('\x1b[31m' + data.toString() + '\x1b[0m')
      })
      childProcess.on('close', function () {
        // dispose status before async file cleanup to avoid false "already running" blocks
        if (runningStatus) {
          if (config.showInfo) {
            writeLine('\x1b[2m■  Execution time ' + getDuration(startTime, new Date()) + '\x1b[0m')
          }
          runningStatus.dispose()
          runningStatus = null
        }
        fs.unlink(tmpFile, function (err) {
          if (err) writeLine('\x1b[31mError: Could not delete temp file: ' + tmpFile + '\x1b[0m')
        })
      })
      childProcess.on('error', function (processError) {
        write('\x1b[31m' + processError.toString() + '\x1b[0m')
        if (config.showInfo) {
          writeLine('\x1b[2m■  End with errors — execution time ' + getDuration(startTime, new Date()) + '\x1b[0m')
        }
        if (runningStatus) {
          runningStatus.dispose()
          runningStatus = null
        }
        fs.unlink(tmpFile, function (err) {
          if (err) writeLine('\x1b[31mError: Could not delete temp file: ' + tmpFile + '\x1b[0m')
        })
      })
    } else { // Legacy terminal mode — sends shell commands to a new terminal instance
      const terminalIndex = terminals.length
      const terminal = vscode.window.createTerminal(`Node.js (${startTime.toLocaleTimeString()})`)
      terminal.filePath = tmpFile
      terminal.index = terminalIndex
      terminal.show()
      terminal.sendText(`cd "${dirName}"`)
      const termArgs = Array.isArray(config.args) ? config.args.join(' ') : ''
      terminal.sendText(`${execBin} "${path.basename(terminal.filePath)}" ${termArgs}`.trimEnd())
      terminal.sendText(`rm "${terminal.filePath}"`) // try to delete the file after execution
      terminals.push(terminal)
    }
  })

  // event for closing a legacy terminal window
  const onCloseTerminal = vscode.window.onDidCloseTerminal(function (terminal) {
    if (terminal.filePath && fs.existsSync(terminal.filePath)) {
      fs.unlink(terminal.filePath, function () {})
      terminals.splice(terminal.index, 1)
    }
  })

  // cancel the exec process
  const cancel = vscode.commands.registerCommand('extension.miramac.node.cancel', function () {
    const config = vscode.workspace.getConfiguration('miramac.node')
    if (config.terminalMode) {
      return
    }
    if (runningStatus) {
      if (config.showInfo) {
        writeLine('\x1b[2mProcess canceled\x1b[0m')
      }
      if (childProcess) {
        childProcess.kill()
      } else {
        runningStatus = null
      }
    }
  })

  context.subscriptions.push(run, cancel, onCloseTerminal, writeEmitter)
}

module.exports = activate
