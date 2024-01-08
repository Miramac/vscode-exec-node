'use strict'
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode')
const spawn = require('child_process').spawn
const spawnSync = require('child_process').spawnSync
const fs = require('fs')
const path = require('path')

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

function activate (context) {
  const outputChannel = vscode.window.createOutputChannel(vscode.workspace.getConfiguration('miramac.node').outputWindowName)
  const terminals = []
  let process
  let runningStatus = null

  // executes JS code with node
  const run = vscode.commands.registerCommand('extension.miramac.node.exec', function () {
    const config = vscode.workspace.getConfiguration('miramac.node')
    // test for running process
    if (runningStatus) {
      vscode.window.showErrorMessage('Process is already running!')
      return
    }

    let editor = vscode.window.activeTextEditor
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
    const tmpFile = path.join(dirName, `node_${require('crypto').createHash('sha1').update(Math.random().toString()).digest('hex').substr(0, 13)}.tmp${extName}`)
    // wirte code in temp file and exec the file with node
    fs.writeFileSync(tmpFile, text)

    let args = [tmpFile]
    if (Array.isArray(config.args) && config.args.length > 0) {
      args = args.concat(config.args)
    }

    if (Array.isArray(config.options) && config.options.length > 0) {
      args = config.options.concat(args)
    }

    const nodePath = spawnSync("node", ["-p", "process.execPath"]);
    const startTime = new Date()
    const nodeBin = (typeof config.nodeBin === 'string' && config.nodeBin !== 'node') ? config.nodeBin : nodePath.stdout.toString().trim()

    if (!config.terminalMode) {
      runningStatus = vscode.window.setStatusBarMessage('Running...')
      outputChannel.show(true)
      if (config.clearOutput) {
        outputChannel.clear()
      }
      if (config.showInfo) {
        outputChannel.appendLine('Info: Start process (' + startTime.toLocaleTimeString() + ')')
      }
      // spawn new node.js process
      process = spawn(nodeBin, args, options)

      // process event handlers
      process.stdout.on('data', function (data) {
        if (!config.showStdout) return
        outputChannel.append(data.toString())
      })
      process.stderr.on('data', function (data) {
        if (!config.showStderr) return
        outputChannel.appendLine('Error: ')
        outputChannel.appendLine(data.toString())
      })
      process.on('close', function () {
        fs.unlink(tmpFile, function (err) {
          if (err) {
            outputChannel.appendLine('Error: Processfile cannot be deleted (mm:ss:fff)')
          }
          if (runningStatus) {
            if (config.showInfo) {
              outputChannel.appendLine('Info: Execution time ' + getDuration(startTime, new Date()) + ' (mm:ss:fff)')
            }
            runningStatus.dispose()
            runningStatus = null
          }
        })
      })
      process.on('error', function (processError) {
        fs.unlink(tmpFile, function (err) {
          if (err) {
            outputChannel.appendLine('Error: Processfile cannot be deleted (mm:ss:fff)')
          }
          outputChannel.appendLine('Process error: ')
          outputChannel.appendLine(processError.toString())
          if (config.showInfo) {
            outputChannel.appendLine('Info: End process with errors! Execution time ' + getDuration(startTime, new Date()) + ' (mm:ss:fff)')
          }
          if (runningStatus) {
            runningStatus.dispose()
            runningStatus = null
          }
        })
      })
    } else { // Terminal Mode
      const terminalIndex = terminals.length
      const terminal = vscode.window.createTerminal(`Node.js (${startTime.toLocaleTimeString()})`)
      terminal.filePath = tmpFile
      terminal.index = terminalIndex
      terminal.show()
      terminal.sendText(`cd "${dirName}"`)
      terminal.sendText(`${config.nodeBin} "${path.basename(terminal.filePath)}" ${config.args.join(' ')}`)
      terminal.sendText(`rm "${terminal.filePath}"`) // try to delete the file after execution
      terminals.push(terminal)
    }
  })

  // event for closing an terminal window
  vscode.window.onDidCloseTerminal(function (terminal) {
    if (terminal.filePath) {
      if (fs.existsSync(terminal.filePath)) {
        // if tmp file still exist, try to delete it
        fs.unlink(terminal.filePath, function (err) {
          if (err) {
            outputChannel.appendLine('Error: Processfile cannot be deleted (mm:ss:fff)')
          }
          terminals.splice(terminal.index, 1)
        })
      }
    }
  })

  // cancel the exec process
  var cancel = vscode.commands.registerCommand('extension.miramac.node.cancel', function () {
    const config = vscode.workspace.getConfiguration('miramac.node')
    if (config.terminalMode) {
      return
    }
    if (runningStatus) {
      if (config.showInfo) {
        outputChannel.appendLine('Process canceled')
      }
      if (process) {
        process.kill()
      } else {
        runningStatus = null
      }
    }
  })

  context.subscriptions.push(run, cancel)
}

module.exports = activate

// get a duration as Timestring (mm:ss.fff)
function getDuration (start, end) {
  const duration = new Date(end - start)
  return numPad(duration.getMinutes(), 1) + ':' + numPad(duration.getSeconds(), 2) + ':' + numPad(duration.getMilliseconds(), 3)
}

// Numberpadding
function numPad (number, size) {
  let result = number + ''
  while (result.length < size) {
    result = '0' + result
  }
  return result
}
