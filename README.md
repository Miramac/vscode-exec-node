# Node.js Exec

**Run your current file or any selected code snippet directly with Node.js — right inside VS Code.**

No terminal setup needed. Press `F8` and see the output immediately in the built-in output panel (or the integrated terminal if you prefer).

---

## Quick Start

| Action | Keybinding | Command palette |
|--------|-----------|-----------------|
| Run file or selection | `F8` | `Execute Node.js` |
| Cancel running process | `F9` | — |

- **Unsaved file?** No problem — the extension runs whatever is in the editor buffer.
- **Selection?** Highlight any lines and press `F8` — only the selected code runs.
- **Nothing selected?** The entire file runs automatically.

---

## Features

- Run the **whole file** or just a **selected snippet** with one keypress
- Output streams **line-by-line** to the integrated terminal with full **ANSI color** support
- `stderr` renders in **red**; info lines render in **dim gray** — visually distinct from program output
- **Ctrl+C** inside the terminal cancels the process (in addition to `F9`)
- Supports **TypeScript** files (`.ts`, `.tsx`) via `ts-node` or `tsx` automatically
- Optional **shell terminal** mode for interactive scripts that read stdin
- Configurable **Node.js binary**, **environment variables**, **CLI arguments**, and **Node options**
- Prepend **shared setup code** to every execution (e.g. imports, constants)
- Automatic cleanup — no temp files left behind

---

## TypeScript Support

Open any `.ts` or `.tsx` file and press `F8`. The extension automatically uses `ts-node` (or your configured runner) instead of `node`.

**Requirements:** Install `ts-node` and `typescript`:

```bash
npm install -g ts-node typescript
# or for tsx (faster, esbuild-based):
npm install -g tsx
```

Switch runner via settings:

```json
{
  "miramac.node.tsRunner": "tsx"
}
```

---

## Configuration Reference

All settings live under the `miramac.node` namespace in your VS Code settings (`settings.json`).

### Output

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `clearOutput` | boolean | `true` | Clear the output panel before each run |
| `showInfo` | boolean | `true` | Show start time and execution duration |
| `showStdout` | boolean | `true` | Display stdout in the output panel |
| `showStderr` | boolean | `true` | Display stderr in the output panel |
| `outputWindowName` | string | `"Node.js"` | Name of the terminal tab used for output |

### Execution

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `nodeBin` | string | `"node"` | Path to the Node.js binary (useful for version managers like `nvm`) |
| `cwd` | string | `"${execPath}"` | Working directory for the process (`${execPath}` = directory of the active file) |
| `executeFileOrSelection` | string | `"both"` | `"file"` always runs whole file, `"selection"` only runs selection, `"both"` runs selection if present otherwise file |
| `args` | array\|null | `null` | Arguments passed to the script (e.g. `["--port", "3000"]`) |
| `options` | array\|null | `null` | Node.js CLI flags prepended to the command (e.g. `["--require", "dotenv/config"]`) |
| `env` | object\|null | `null` | Extra environment variables for the child process |
| `includeCode` | string\|null | `null` | Code prepended to every execution (e.g. shared imports or constants) |
| `tsRunner` | string | `"ts-node"` | Runner for `.ts`/`.tsx` files — `"ts-node"` or `"tsx"` |
| `terminalMode` | boolean | `false` | Use the integrated terminal instead of the output panel |

### Advanced

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `legacyMode` | boolean | `false` | Load the legacy v0.2.1 implementation (for users who need backward compatibility) |

---

## Configuration Examples

**Custom Node.js binary** (e.g. a specific version via nvm):

```json
{
  "miramac.node.nodeBin": "/home/user/.nvm/versions/node/v18.0.0/bin/node"
}
```

**Set environment variables:**

```json
{
  "miramac.node.env": {
    "NODE_ENV": "production",
    "API_KEY": "my-key"
  }
}
```

**Pass script arguments:**

```json
{
  "miramac.node.args": ["--port", "1337"]
}
```

**Use Node.js CLI options** (e.g. load a module before running):

```json
{
  "miramac.node.options": ["--require", "dotenv/config"]
}
```

**Prepend shared setup code to every run:**

```json
{
  "miramac.node.includeCode": "const DEBUG = true; const path = require('path');"
}
```

**Run in shell terminal mode** (useful for interactive scripts that read stdin; creates a new terminal tab per run):

```json
{
  "miramac.node.terminalMode": true
}
```

---

## How It Works

1. When you press `F8`, the extension reads the selected text (or the full file) from the editor buffer.
2. The code is written to a temporary file (`node_<random>.tmp.js`) in the same directory as your source file — this ensures `__dirname`, `__filename`, and relative `require()` paths all resolve correctly.
3. Node.js (or `ts-node` for TypeScript) is spawned as a child process pointing at the temp file.
4. `stdout` and `stderr` are streamed directly to a persistent PTY terminal in the TERMINAL panel as they arrive, with full ANSI color rendering.
5. The temp file is deleted immediately after the process exits.

> The extension uses `child_process.spawn()` for streaming and a VS Code pseudoterminal (`Pseudoterminal` API, requires VS Code 1.25+) for output rendering.

---

## Troubleshooting

**"Unknown working directory" warning**
The file has not been saved yet and has no path. Save it once and press F8 again.

**"Process is already running!" error**
A previous execution is still in progress. Press `F9` to cancel it first.

**TypeScript files don't run**
Install `ts-node` and `typescript` globally (`npm install -g ts-node typescript`) or set `miramac.node.tsRunner` to `tsx` if you prefer that runner.

**Output appears garbled or ANSI codes are visible**
Ensure your VS Code version is 1.25 or newer. The PTY terminal requires that version for the pseudoterminal API.

---

> Bugs and feedback: https://github.com/Miramac/vscode-exec-node/issues

**Enjoy!**
