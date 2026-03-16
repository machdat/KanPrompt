/**
 * KanPrompt Companion Server v0.5.0
 *
 * Tiny local HTTP server that bridges the browser sandbox gap.
 * KanPrompt (HTML) talks to this via fetch('http://localhost:9177/...').
 *
 * Endpoints:
 *   GET  /ping                → health check
 *   GET  /info                → list endpoints
 *   POST /find-project        → resolve folder name to full path
 *   POST /open-editor         → open file in system default editor
 *   POST /open-terminal       → open terminal at directory
 *   POST /claude-code         → launch Claude Code at project path
 *   POST /open-folder         → open folder in Windows Explorer
 *
 * Start:  node kanprompt-companion.js
 */

const http = require('http');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const url = require('url');
const os = require('os');

const PORT = 9177;
const HOST = '127.0.0.1';

// Directories to search for projects (add your own)
const PROJECT_SEARCH_PATHS = [
  path.join(os.homedir(), 'IdeaProjects'),
  path.join(os.homedir(), 'Projects'),
  path.join(os.homedir(), 'repos'),
  path.join(os.homedir(), 'Documents'),
  'C:\\git',
  'C:\\Projects',
];

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, status, data) {
  setCors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
  });
}

// Find a project folder by name across known search paths
function findProjectPath(folderName) {
  const results = [];
  for (const searchDir of PROJECT_SEARCH_PATHS) {
    const candidate = path.join(searchDir, folderName);
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        results.push(candidate);
      }
    } catch {}
  }
  // Also check if folderName itself is an absolute path
  try {
    if (path.isAbsolute(folderName) && fs.existsSync(folderName)) {
      results.push(folderName);
    }
  } catch {}
  return results;
}

// ══════════════════════════════════════
//  REQUEST HANDLER
// ══════════════════════════════════════
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    setCors(res); res.writeHead(204); res.end(); return;
  }
  const route = url.parse(req.url, true).pathname;

  try {
    // ── PING ──
    if (route === '/ping' && req.method === 'GET') {
      return json(res, 200, { status: 'ok', server: 'kanprompt-companion', version: '0.5.0', pid: process.pid, uptime: Math.floor(process.uptime()) });
    }

    // ── FIND PROJECT (resolves folder name → full path) ──
    if (route === '/find-project' && req.method === 'POST') {
      const { name } = await readBody(req);
      if (!name) return json(res, 400, { error: 'name required' });
      const results = findProjectPath(name);
      if (results.length === 0) {
        return json(res, 200, { found: false, name, searchPaths: PROJECT_SEARCH_PATHS });
      }
      return json(res, 200, { found: true, path: results[0], all: results });
    }

    // ── OPEN EDITOR ──
    if (route === '/open-editor' && req.method === 'POST') {
      const { filePath, line } = await readBody(req);
      if (!filePath) return json(res, 400, { error: 'filePath required' });
      const resolved = path.resolve(filePath);
      const lineArg = line ? `:${line}` : '';
      exec(`start "" "${resolved}"`, (err) => {
        if (err) return json(res, 500, { error: err.message });
        json(res, 200, { action: 'opened', editor: 'system-default', file: resolved });
      });
      return;
    }

    // ── OPEN TERMINAL ──
    if (route === '/open-terminal' && req.method === 'POST') {
      const { dirPath, command } = await readBody(req);
      if (!dirPath) return json(res, 400, { error: 'dirPath required' });
      const resolved = path.resolve(dirPath);
      const cmd = command
        ? `start cmd /k "cd /d "${resolved}" && ${command}"`
        : `start cmd /k "cd /d "${resolved}""`;
      exec(cmd, (err) => {
        if (err) return json(res, 500, { error: err.message });
        json(res, 200, { action: 'terminal-opened', dir: resolved });
      });
      return;
    }

    // ── CLAUDE CODE ──
    if (route === '/claude-code' && req.method === 'POST') {
      const { projectPath, prompt } = await readBody(req);
      if (!projectPath) return json(res, 400, { error: 'projectPath required' });
      const resolved = path.resolve(projectPath);
      let cc = 'claude';
      if (prompt) cc = `claude -p "${prompt.replace(/"/g, '\\"')}"`;
      exec(`start "Claude Code" cmd /k "cd /d "${resolved}" && ${cc}"`, (err) => {
        if (err) return json(res, 500, { error: err.message });
        json(res, 200, { action: 'claude-code-launched', project: resolved });
      });
      return;
    }

    // ── OPEN FOLDER ──
    if (route === '/open-folder' && req.method === 'POST') {
      const { dirPath } = await readBody(req);
      if (!dirPath) return json(res, 400, { error: 'dirPath required' });
      exec(`explorer "${path.resolve(dirPath)}"`, (err) => {
        if (err) return json(res, 500, { error: err.message });
        json(res, 200, { action: 'folder-opened', dir: path.resolve(dirPath) });
      });
      return;
    }

    // ── INFO ──
    if (route === '/info' && req.method === 'GET') {
      return json(res, 200, {
        server: 'kanprompt-companion', version: '0.5.0',
        searchPaths: PROJECT_SEARCH_PATHS,
        endpoints: [
          'GET  /ping', 'GET  /info',
          'POST /find-project  {name}',
          'POST /open-editor   {filePath, line?}',
          'POST /open-terminal {dirPath, command?}',
          'POST /claude-code   {projectPath, prompt?}',
          'POST /open-folder   {dirPath}',
        ],
      });
    }

    json(res, 404, { error: 'Unknown route: ' + route });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`
  ┌──────────────────────────────────────┐
  │  KanPrompt Companion  v0.5.0         │
  │  http://${HOST}:${PORT}               │
  │                                      │
  │  Endpoints:                          │
  │    GET  /ping            health      │
  │    GET  /info            help        │
  │    POST /find-project    resolve     │
  │    POST /open-editor     Editor     │
  │    POST /open-terminal   terminal    │
  │    POST /claude-code     Claude CC   │
  │    POST /open-folder     Explorer    │
  │                                      │
  │  Press Ctrl+C to stop               │
  └──────────────────────────────────────┘
  `);
});
