'use strict'
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode')
const spawn = require('child_process').spawn
const fs = require('fs')
const path = require('path')
const config = vscode.workspace.getConfiguration('miramac.node')

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

function activate (context) {
  const outputChannel = vscode.window.createOutputChannel('Node.js')
  let vqProcess
  let runningStatus = null

  // executes JS code with node
  let run = vscode.commands.registerCommand('extension.miramac.node.exec', function () {
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

    let selection = editor.selection
    let text = editor.document.getText(selection)

    if (text === '') {
      text = editor.document.getText()
    }

    //
    let dirName = path.dirname(editor.document.fileName)
    if (!dirName || dirName === '' || dirName === '.') {
      vscode.window.showWarningMessage('Unknown working directory! Try to save the file before running.')
      return
    }
    // get cwd from config and replace placeholder
    let cwd = (typeof config.cwd === 'string') ? config.cwd.replace('${execPath}', dirName) : dirName
    // set tempfile
    let tmpFile = path.join(dirName, `node_${require('crypto').createHash('sha1').update(Math.random().toString()).digest('hex').substr(0, 13)}.tmp`)
    let startTime = new Date()
    runningStatus = vscode.window.setStatusBarMessage('Running...')
    outputChannel.show(vscode.window.visibleTextEditors.length + 1)
    if (config.clearOutput) {
      outputChannel.clear()
    }
    if (config.showInfo) {
      outputChannel.appendLine('Info: Start process (' + startTime.toLocaleTimeString() + ')')
    }

    // wirte code in temp file and exec the file with node
    fs.writeFileSync(tmpFile, text)
    vqProcess = spawn('node', [tmpFile], {cwd: cwd})

    vqProcess.stdout.on('data', function (data) {
      if (!config.showStdout) return
      outputChannel.append(data.toString())
    })
    vqProcess.stderr.on('data', function (data) {
      if (!config.showStderr) return
      outputChannel.appendLine('Error: ')
      outputChannel.appendLine(data.toString())
    })
    vqProcess.on('close', function () {
      fs.unlink(tmpFile)
      if (config.showInfo) {
        outputChannel.appendLine('Info: End process (' + new Date().toLocaleTimeString() + ')')
      }
      runningStatus.dispose()
      runningStatus = null
    })
  })

  // cancel the exec process
  var cancel = vscode.commands.registerCommand('extension.miramac.node.cancel', function () {
    if (runningStatus) {
      outputChannel.appendLine('Process canceled')
      if (vqProcess) {
        vqProcess.kill()
      } else {
        runningStatus = null
      }
    }
  })

  context.subscriptions.push(run, cancel)
}

module.exports = activate
