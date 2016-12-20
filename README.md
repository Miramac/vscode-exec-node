# Node Exec
### Execute the current file or your selected code with node.js.

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

## How it works
The selected code or if nothing is selected, the active file, is written in a temporarily file (something like `node_<random-sring>.tmp`). You don't have to save the file for execution.
This file will be executed by your installed version of node.js. Therefore `node` has to be in the PATH.
```javascript
require('child_process').spawn('node', [tmpFile])
```
Any data from `stdout` or `stderr` will be printed to an OutputChannel. Unfortunately console colors won't work.

> Bugs and feedback: https://github.com/Miramac/vscode-exec-node/issues

**Enjoy!**