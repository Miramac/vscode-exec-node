# Node.js Exec

### Run the current file or the code you selected with node.js.

## Usage

* To execute the current file or the selection press `F8` or use the command `Execute Node.js`
* To cancel a running process press `F9`

## Configuration

Clear output before execution

````json
{
  "miramac.node.clearOutput": true
}
````

Show start and end info

````json
{
  "miramac.node.showInfo": true
}
````

Show stdout and stderr

````json
{
  "miramac.node.showStdout": true,
  "miramac.node.showStderr": true
}
````

If `miramac.node.legacyMode` is `true` (default) the extention will not use new features and options. Because of some strange problems I can't reproduce, the extension remains in legacy mode. To use the following options simply set this option to `false`

````json
{
  "miramac.node.legacyMode": false
}
````

### The folloing options need to set the legacyMode off

Set environment variables for execution:

````json
{
  "miramac.node.env": {
      "NODE_ENV": "production"
  }
}
````

Add arguments for execution:

````json
{
  "miramac.node.args": ["--port", "1337"]
}
````

Add options for execution:

````json
{
  "miramac.node.options": ["--require", "babel-register"]
}
````

Change the node binary for execution

````json
{
  "miramac.node.nodeBin": "/path/to/some/bin/node-7.0"
}
````

Some code that is executed with each run

````json
{
  "miramac.node.includeCode": "const DEBUG = true; const fs = require('fs'); "
}
````

## How it works

The selected code or if nothing is selected, the active file, is written in a temporarily file (something like `node_<random-sring>.tmp`). You don't have to save the file for execution.
This file will be executed by your installed version of node.js. Therefore `node` has to be in the PATH.

```javascript
require('child_process').spawn('node', options,[tmpFile, args])
```

Any data from `stdout` or `stderr` will be printed to an OutputChannel. Unfortunately console colors won't work.

> Bugs and feedback: https://github.com/Miramac/vscode-exec-node/issues

**Enjoy!**