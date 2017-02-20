'use strict'
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode')
const spawn = require('child_process').spawn
const fs = require('fs')
const path = require('path')

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

function activate (context) {
  const outputChannel = vscode.window.createOutputChannel(vscode.workspace.getConfiguration('miramac.node').outputWindowName)
  let terminals = []
  let process
  let runningStatus = null

  // executes JS code with node
  let run = vscode.commands.registerCommand('extension.miramac.node.exec', function () {
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

    if (editor._documentData._languageId === 'Log') {
      editor = vscode.window.visibleTextEditors[0]
    }

    let dirName = path.dirname(editor.document.fileName)
    if (!dirName || dirName === '' || dirName === '.') {
      vscode.window.showWarningMessage('Unknown working directory! Try to save the file before running.')
      return
    }

    let selection = editor.selection
    let text = editor.document.getText(selection)

    if ((text === '' && config.executeFileOrSelection === 'both') || config.executeFileOrSelection === 'file') {
      text = editor.document.getText()
    }
    if (config.includeCode) {
      text = config.includeCode.replace('${execPath}', dirName) + ';\n' + text // eslint-disable-line no-template-curly-in-string
    }

    // get config params object
    let params = config.params
    // get cwd from config, replace placeholder and add it to the params object
    params.cwd = (typeof config.cwd === 'string') ? config.cwd.replace('${execPath}', dirName) : dirName  // eslint-disable-line no-template-curly-in-string
    // set tempfile
    let tmpFile = path.join(dirName, `node_${require('crypto').createHash('sha1').update(Math.random().toString()).digest('hex').substr(0, 13)}.tmp`)
    // wirte code in temp file and exec the file with node
    fs.writeFileSync(tmpFile, text)
    let startTime = new Date()
    if (!config.terminalMode) {
      runningStatus = vscode.window.setStatusBarMessage('Running...')
      outputChannel.show(vscode.window.visibleTextEditors.length + 1)
      if (config.clearOutput) {
        outputChannel.clear()
      }
      if (config.showInfo) {
        outputChannel.appendLine('Info: Start process (' + startTime.toLocaleTimeString() + ')')
      }
      // spawn new node.js process
      process = spawn('node', [tmpFile], params)

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
        fs.unlink(tmpFile)
        if (config.showInfo) {
          outputChannel.appendLine('Info: End process (' + new Date().toLocaleTimeString() + ')')
        }
        runningStatus.dispose()
        runningStatus = null
      })
    } else { // Terminal Mode
      let terminalIndex = terminals.length
      let terminal = vscode.window.createTerminal(`Node.js (${startTime.toLocaleTimeString()})`)
      terminal.filePath = tmpFile
      terminal.index = terminalIndex
      terminal.show()
      terminal.sendText(`cd "${dirName}"`)
      terminal.sendText(`${config.terminalCmd} "${path.basename(terminal.filePath)}"`)
      terminal.sendText(`rm "${terminal.filePath}"`)
      terminals.push(terminal)
    }
  })

  vscode.window.onDidCloseTerminal(function (terminal) {
    if (terminal.filePath) {
      if (fs.existsSync(terminal.filePath)) {
        fs.unlink(terminal.filePath)
      }
      terminals.splice(terminal.index, 1)
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
