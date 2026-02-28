# CLAUDE.md — AI Assistant Guide for vscode-exec-node

## Project Overview

**vscode-exec-node** is a VSCode extension (publisher: `miramac`) that lets developers execute the current file or selected code with Node.js directly from the editor. It is plain JavaScript with no build step and no production dependencies.

- **Version:** 0.5.6
- **Entry point:** `extension.js`
- **Key commands:** `extension.miramac.node.exec` (F8), `extension.miramac.node.cancel` (F9)
- **Marketplace category:** Other (VSCode extension)

---

## Repository Structure

```
vscode-exec-node/
├── extension.js              # Extension entry point — routes to current or legacy activate module
├── lib/
│   ├── activate.js           # Current implementation (all active development here)
│   └── activate.0.2.1.js     # Legacy implementation (preserved for legacyMode users)
├── test/
│   ├── index.js              # Mocha test runner configuration (TDD UI)
│   ├── extension.test.js     # Extension test suite (minimal coverage)
│   └── testfile.js           # Sample file used for manual testing inside the extension
├── typings/
│   ├── node.d.ts             # Reference to Node.js type defs for IntelliSense
│   └── vscode-typings.d.ts   # Reference to VSCode API type defs for IntelliSense
├── images/
│   └── node-exec-logo.png    # Extension marketplace icon
├── .vscode/
│   └── launch.json           # Debug launch configs (Launch Extension / Launch Tests)
├── package.json              # Extension manifest and VSCode contribution points
├── README.md                 # End-user documentation
├── LICENSE                   # ISC License
├── .gitignore                # Ignores node_modules and *.tmp files
└── .vscodeignore             # Excludes dev/test files from packaged extension
```

---

## Architecture and Key Conventions

### Module Loading

`extension.js` is the sole entry point. It checks the `miramac.node.legacyMode` configuration and conditionally loads one of two activate modules:

```js
// extension.js
const legacyMode = vscode.workspace.getConfiguration('miramac.node').get('legacyMode');
const { activate, deactivate } = legacyMode
  ? require('./lib/activate.0.2.1')
  : require('./lib/activate');
```

**All new feature work must go into `lib/activate.js` only.** Never modify `lib/activate.0.2.1.js` unless fixing a critical bug that affects legacy users — it exists solely for backward compatibility.

### Code Style

- **Language:** Plain JavaScript (CommonJS, no TypeScript, no transpilation)
- `'use strict'` at the top of every file
- Use `const`/`let` in `lib/activate.js`; avoid `var`
- Arrow functions preferred in `lib/activate.js`
- `require()` / `module.exports` for all module imports/exports

### Configuration Access Pattern

Configuration is read fresh on **each command invocation** (not cached at module load):

```js
const config = vscode.workspace.getConfiguration('miramac.node');
const nodeBin = config.get('nodeBin') || 'node';
```

All configuration keys use the `miramac.node.*` namespace (defined in `package.json` under `contributes.configuration`).

### Temporary File Naming

Temporary files are created per execution using a SHA1 hash for uniqueness:

```
node_<13-char-sha1-prefix>.tmp<source-extension>
```

Example: `node_3f2a1b9c0d4e5.tmp.js`

Temp files are **always cleaned up** after the child process exits. The `.gitignore` already excludes `*.tmp` files.

### Process Execution

The extension uses `child_process.spawn()` (async) for running user code and `child_process.spawnSync()` (sync) only for detecting the Node.js executable path at startup.

- stdout is streamed line-by-line to the VSCode output channel
- stderr lines are prefixed with `"Error: "` and also sent to the output channel
- The spawned process PID is tracked for cancellation via F9

---

## Configuration Reference

All settings are namespaced under `miramac.node` in VSCode settings:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `cwd` | string | `${execPath}` | Working directory for Node.js process |
| `nodeBin` | string | `"node"` | Path to Node.js binary |
| `clearOutput` | boolean | `true` | Clear output channel before each run |
| `showInfo` | boolean | `true` | Show start/end timestamps and duration |
| `showStdout` | boolean | `true` | Display stdout in output panel |
| `showStderr` | boolean | `true` | Display stderr in output panel |
| `terminalMode` | boolean | `false` | Use integrated terminal instead of output panel |
| `includeCode` | string\|null | `null` | Code prepended to every execution |
| `executeFileOrSelection` | string | `"both"` | `"file"`, `"selection"`, or `"both"` |
| `outputWindowName` | string | `"Node.js"` | Output channel display name |
| `env` | object\|null | `null` | Extra environment variables for the process |
| `args` | array\|null | `null` | Arguments passed to the script |
| `options` | array\|null | `null` | Node.js CLI options (e.g., `--require`, `--no-warnings`) |
| `legacyMode` | boolean | `true` | Load `activate.0.2.1.js` instead of `activate.js` |

> **Note:** `legacyMode` defaults to `true` for backward compatibility. New installations should set it to `false`.

---

## Development Workflow

### Prerequisites

- Node.js installed
- VSCode or VSCode Insiders
- `vsce` CLI for publishing (`npm install -g vsce`)

### Setup

```bash
npm install
```

The `postinstall` script automatically installs VSCode binaries needed for testing.

### Running the Extension Locally

Use the launch configurations in `.vscode/launch.json`:

- **Launch Extension** — Opens a new VSCode Extension Development Host window with the extension loaded, pointing to the `test/` workspace.
- **Launch Tests** — Runs the Mocha test suite in the Extension Host.

In VSCode: press **F5** with the "Launch Extension" config selected.

### Running Tests

Tests use VSCode's built-in test framework with Mocha (TDD UI):

```bash
# Via VSCode launch config (recommended):
# Select "Launch Tests" in launch.json and press F5

# No standalone npm test script is defined
```

Test file: `test/extension.test.js`
Test runner setup: `test/index.js`

> **Note:** Test coverage is minimal (one placeholder test). When adding features, add corresponding tests in `test/extension.test.js`.

### Manual Testing

Open `test/testfile.js` in the Extension Development Host and press F8 to run it. It exercises:
- `__dirname` logging
- ANSI color output
- `setTimeout` with repeating intervals (tests cancellation via F9)
- `process.env` display

### Publishing

```bash
npm run vsce-publish
```

This uses the VSCE tool to package and publish to the VSCode Marketplace. Ensure `package.json` version is bumped before publishing.

---

## Making Changes

### Adding a New Configuration Option

1. Add the property to `contributes.configuration.properties` in `package.json` with type, default, and description.
2. Read it in `lib/activate.js` using `config.get('newOption')` inside the command handler.
3. Document it in `README.md` under the Configuration section.

### Adding a New Command

1. Register the command in `contributes.commands` in `package.json`.
2. Add the keybinding (if any) to `contributes.keybindings`.
3. Register the handler in the `activate()` function in `lib/activate.js` using `vscode.commands.registerCommand()`.
4. Push the disposable to `context.subscriptions`.

### Modifying Process Execution

The core execution flow in `lib/activate.js`:

1. Get active editor text (selection or full file)
2. Write content to a temp file (`node_<hash>.tmp<ext>`)
3. Optionally prepend `includeCode`
4. Spawn Node.js child process with configured binary, options, args, cwd, and env
5. Stream stdout/stderr to output channel
6. Delete temp file in the `close` event callback

Keep temp file cleanup in the `close` event (not `exit`) to ensure it runs after all I/O is flushed.

---

## What Not to Do

- **Do not modify `lib/activate.0.2.1.js`** for new features — it is a frozen legacy snapshot.
- **Do not add production dependencies** — the extension intentionally has zero runtime deps.
- **Do not add a build/transpile step** — the extension ships as-is (plain JS).
- **Do not cache configuration** at module load time — always read from `getConfiguration()` per invocation so workspace overrides work correctly.
- **Do not leave temp files** — always clean up in the `close` callback, even on error paths.
- **Do not use `exec()`** for running user code — `spawn()` is required for streaming output.

---

## File Patterns to Know

| Pattern | Meaning |
|---------|---------|
| `*.tmp` | Temporary execution files — gitignored, always deleted post-run |
| `activate.*.js` | Versioned activate modules in `lib/` |
| `test/*.test.js` | Mocha test files |
| `typings/*.d.ts` | Type definition references (not compiled, IntelliSense only) |

---

## Key VSCode APIs Used

- `vscode.window.createOutputChannel()` — persistent output panel
- `vscode.window.setStatusBarMessage()` — transient status bar feedback
- `vscode.window.activeTextEditor` — get current open file
- `vscode.window.createTerminal()` / `onDidCloseTerminal()` — terminal mode support
- `vscode.commands.registerCommand()` — command registration
- `vscode.workspace.getConfiguration()` — settings access
- `vscode.window.showErrorMessage()` / `showWarningMessage()` — user notifications
