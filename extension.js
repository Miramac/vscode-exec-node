'use strict'
let activate
// this method is called when your extension is activated
if (require('vscode').workspace.getConfiguration('miramac.node').legacyMode) {
  activate = require('./lib/activate.0.2.1')
} else {
  activate = require('./lib/activate')
}
exports.activate = activate

// this method is called when your extension is deactivated
function deactivate () {
  // add some cleanup
}
exports.deactivate = deactivate
