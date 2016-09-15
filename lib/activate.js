// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode')
var spawn = require('child_process').spawn
var fs = require('fs')
var path = require('path')

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

function activate (context) {
  var vqProcess
  var outputChannel = vscode.window.createOutputChannel('Node.js')
  var runningStatus = null

  // executes JS code with node
  var run = vscode.commands.registerCommand('extension.miramac.node.exec', function () {
    // test for running process
    if (runningStatus) {
      vscode.window.showErrorMessage('Process is already running!')
      return
    }

    var editor = vscode.window.activeTextEditor
    if (!editor) {
      return // No open text editor
    }

    if (editor._documentData._languageId === 'Log') {
      editor = vscode.window.visibleTextEditors[0]
    }

    var selection = editor.selection
    var text = editor.document.getText(selection)

    if (text === '') {
      text = editor.document.getText()
    }

    var dirName = path.dirname(editor.document.fileName)
    if (!dirName || dirName === '' || dirName === '.') {
      vscode.window.showWarningMessage('Unknown working directory! Try to save the file before running.')
      return
    }
    var tmpFile = path.join(dirName, `node_${require('crypto').createHash('sha1').update(Math.random().toString()).digest('hex').substr(0, 13)}.tmp`)
    var startTime = new Date()
    runningStatus = vscode.window.setStatusBarMessage('Running...')
    outputChannel.show(vscode.window.visibleTextEditors.length + 1)
    outputChannel.appendLine('Info: Start process (' + startTime.toLocaleTimeString() + ')')

    // wirte code in temp file and exec the file with node
    fs.writeFileSync(tmpFile, text)
    vqProcess = spawn('node', [tmpFile], {cwd: dirName})

    vqProcess.stdout.on('data', function (data) {
      outputChannel.append(data.toString())
    })
    vqProcess.stderr.on('data', function (data) {
      outputChannel.appendLine('Error: ')
      outputChannel.appendLine(data.toString())
    })
    vqProcess.on('close', function () {
      fs.unlink(tmpFile)
      outputChannel.appendLine('Info: End process (' + new Date().toLocaleTimeString() + ')')
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
