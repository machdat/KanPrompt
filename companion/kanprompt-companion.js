/**
 * KanPrompt Companion Server v1.0.0
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
 *   POST /start-cc            → live-runner: stream-json + optional resume
 *   POST /start-cc-worktree   → (alias for /start-cc, backward compat)
 *   POST /open-folder         → open folder in Windows Explorer
 *   POST /cc-event            → receive events from cc-live-runner
 *   GET  /cc-instances        → list all CC instances (running + recent)
 *   GET  /cc-status-stream    → SSE stream for live dashboard updates
 *   POST /worktree-list       → list git worktrees for a project
 *   POST /worktree-remove     → remove a git worktree
 *   POST /worktree-merge      → merge worktree branch + remove
 *   POST /project-backlog     → load backlog entries from any project
 *   POST /git-status          → branch + dirty/clean for a project
 *   POST /git-status-all      → batch git status for multiple projects
 *   POST /cc-stop             → stop a running CC instance
 *   POST /focus-window        → bring terminal window to front
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
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

// ══════════════════════════════════════
//  CC INSTANCE REGISTRY
// ══════════════════════════════════════
const ccInstances = new Map(); // id → instance object
const sseClients = new Set();  // active SSE connections
const INSTANCE_MAX_AGE_MS = 60 * 60 * 1000; // 1h cleanup for finished instances
const INSTANCE_EVENTS_MAX = 50; // keep last N events per instance

function generateInstanceId() {
  return 'cc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
}

function registerInstance(id, data) {
  ccInstances.set(id, {
    id,
    prompt: data.prompt || '',
    cwd: data.cwd || '',
    branch: data.branch || null,
    worktree: data.worktree || false,
    startedAt: new Date().toISOString(),
    status: 'running',
    sessionId: null,
    lastTool: null,
    cost: null,
    duration: null,
    pid: null,
    events: [],
  });
  broadcastSSE({ type: 'instance-started', instance: ccInstances.get(id) });
}

function updateInstance(id, update) {
  const inst = ccInstances.get(id);
  if (!inst) return;
  Object.assign(inst, update);
  if (update.events) {
    // append, don't replace
    delete update.events;
  }
}

function addInstanceEvent(id, event) {
  const inst = ccInstances.get(id);
  if (!inst) return;
  inst.events.push({ ...event, timestamp: new Date().toISOString() });
  if (inst.events.length > INSTANCE_EVENTS_MAX) {
    inst.events = inst.events.slice(-INSTANCE_EVENTS_MAX);
  }
}

function broadcastSSE(data) {
  const msg = 'data: ' + JSON.stringify(data) + '\n\n';
  for (const client of sseClients) {
    try { client.write(msg); } catch { sseClients.delete(client); }
  }
}

// Cleanup finished instances older than INSTANCE_MAX_AGE_MS
setInterval(() => {
  const now = Date.now();
  for (const [id, inst] of ccInstances) {
    if (inst.status !== 'running') {
      const finishedAt = inst.finishedAt ? new Date(inst.finishedAt).getTime() : new Date(inst.startedAt).getTime();
      if (now - finishedAt > INSTANCE_MAX_AGE_MS) ccInstances.delete(id);
    }
  }
}, 5 * 60 * 1000);

// ══════════════════════════════════════
//  PROJECTS REGISTRY
// ══════════════════════════════════════
const REGISTRY_FILE = path.join(__dirname, 'projects-registry.json');
let registry = { version: 1, lastUpdated: null, projects: {} };

function nowISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function loadRegistry() {
  try {
    if (fs.existsSync(REGISTRY_FILE)) {
      const raw = fs.readFileSync(REGISTRY_FILE, 'utf-8');
      registry = JSON.parse(raw);
      return true;
    }
  } catch (e) {
    console.error('Registry laden fehlgeschlagen:', e.message);
  }
  return false;
}

function saveRegistry() {
  registry.lastUpdated = nowISO();
  const tmp = REGISTRY_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(registry, null, 2), 'utf-8');
  try {
    fs.renameSync(tmp, REGISTRY_FILE);
  } catch {
    // Fallback for Windows: delete target, then rename
    try { fs.unlinkSync(REGISTRY_FILE); } catch {}
    fs.renameSync(tmp, REGISTRY_FILE);
  }
}

function recoverFromSnapshots() {
  const recovered = {};
  for (const searchDir of PROJECT_SEARCH_PATHS) {
    try {
      if (!fs.existsSync(searchDir)) continue;
      const entries = fs.readdirSync(searchDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const projectPath = path.join(searchDir, entry.name);
        for (const promptsDir of ['doc/prompts', 'prompts', '.prompts']) {
          const snapshotFile = path.join(projectPath, promptsDir, '.registry-snapshot.json');
          try {
            if (fs.existsSync(snapshotFile)) {
              const snap = JSON.parse(fs.readFileSync(snapshotFile, 'utf-8'));
              if (snap.id && !recovered[snap.id]) {
                recovered[snap.id] = snap;
                delete recovered[snap.id].id; // id is the key, not a field
                console.log(`  Recovery: Projekt "${snap.id}" aus ${snapshotFile}`);
              }
            }
          } catch {}
        }
      }
    } catch {}
  }
  if (Object.keys(recovered).length > 0) {
    registry.projects = recovered;
    saveRegistry();
    console.log(`  ${Object.keys(recovered).length} Projekt(e) aus Snapshots wiederhergestellt.`);
    return true;
  }
  return false;
}

// Initialize registry
if (!loadRegistry()) {
  console.log('Keine Registry gefunden, versuche Recovery aus Snapshots...');
  if (!recoverFromSnapshots()) {
    saveRegistry();
    console.log('Leere Registry erstellt.');
  }
} else {
  console.log(`Registry geladen: ${Object.keys(registry.projects).length} Projekt(e).`);
}

// Simple route matcher for REST-style paths with :params
function matchRoute(pathname, pattern) {
  const pp = pattern.split('/');
  const up = pathname.split('/');
  if (pp.length !== up.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) {
      params[pp[i].slice(1)] = decodeURIComponent(up[i]);
    } else if (pp[i] !== up[i]) {
      return null;
    }
  }
  return params;
}

// Status transition logic
const STATUS_ORDER = ['new', 'in-progress', 'done', 'deleted'];
const STATUS_FOLDERS = { 'new': 'new', 'in-progress': 'in-progress', 'done': 'done', 'deleted': 'deleted' };

function transitionCardStatus(card, newStatus) {
  const oldIdx = STATUS_ORDER.indexOf(card.status);
  const newIdx = STATUS_ORDER.indexOf(newStatus);
  if (newIdx === -1) return { error: 'Ungültiger Status: ' + newStatus };

  const oldStatus = card.status;
  card.status = newStatus;

  if (!card.timestamps) card.timestamps = {};
  card.timestamps[newStatus] = nowISO();

  // Backward movement: clear timestamps for states after the new one
  if (newIdx < oldIdx) {
    for (let i = newIdx + 1; i < STATUS_ORDER.length; i++) {
      card.timestamps[STATUS_ORDER[i]] = null;
    }
  }

  return { ok: true, oldStatus };
}

// Write denormalized status into markdown file (best-effort)
function writeDenormalizedStatus(project, card) {
  if (!project.projectPath || !project.promptsDir || !card.file) return;
  // Try each possible folder (file may not have moved yet)
  let filePath = null;
  for (const folder of Object.values(STATUS_FOLDERS)) {
    const candidate = path.join(project.projectPath, project.promptsDir, folder, card.file);
    if (fs.existsSync(candidate)) { filePath = candidate; break; }
  }
  if (!filePath) return;
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const statusLine = `<!-- status: ${card.status} -->`;
    if (content.match(/^<!-- status: .* -->$/m)) {
      content = content.replace(/^<!-- status: .* -->$/m, statusLine);
    } else {
      // Insert after first # heading
      const headingMatch = content.match(/^(# .*\n)/m);
      if (headingMatch) {
        const idx = content.indexOf(headingMatch[0]) + headingMatch[0].length;
        content = content.slice(0, idx) + statusLine + '\n' + content.slice(idx);
      } else {
        content = statusLine + '\n' + content;
      }
    }
    fs.writeFileSync(filePath, content, 'utf-8');
  } catch {}
}

// Create snapshot for a project
function createSnapshot(projectId) {
  const project = registry.projects[projectId];
  if (!project) return { error: 'Projekt nicht gefunden: ' + projectId };
  if (!project.projectPath || !project.promptsDir) return { error: 'projectPath/promptsDir nicht konfiguriert' };

  const snapshotData = { id: projectId, ...project };
  const snapshotDir = path.join(project.projectPath, project.promptsDir);
  const snapshotPath = path.join(snapshotDir, '.registry-snapshot.json');

  try {
    if (!fs.existsSync(snapshotDir)) return { error: 'Prompts-Verzeichnis existiert nicht: ' + snapshotDir };
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshotData, null, 2), 'utf-8');
    project.lastSnapshotAt = nowISO();
    saveRegistry();
    return { ok: true, path: snapshotPath };
  } catch (e) {
    return { error: 'Snapshot fehlgeschlagen: ' + e.message };
  }
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

function launchCCLiveRunner(res, cwd, prompt, branchName, isWorktree, interactive, allowedTools) {
  const projectName = path.basename(isWorktree ? path.resolve(cwd, '..', '..') : cwd);
  const title = 'CC: ' + projectName + (branchName ? ' | ' + branchName : '');
  const instanceId = generateInstanceId();

  // Instanz in Registry eintragen
  registerInstance(instanceId, { prompt, cwd, branch: branchName, worktree: isWorktree });

  // Config-JSON in Temp-Verzeichnis schreiben
  const configFile = path.join(os.tmpdir(), 'kanprompt-cc-' + Date.now() + '.json');
  const config = {
    prompt,
    cwd,
    allowedTools: allowedTools || 'Read,Write,Edit,Bash(node *),Bash(git *)',
    interactive: interactive !== false,
    title,
    instanceId,
    companionUrl: `http://${HOST}:${PORT}`,
  };
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

  // cc-live-runner.js liegt im selben Verzeichnis
  const runnerPath = path.join(__dirname, 'cc-live-runner.js');
  const nodeCmd = `node "${runnerPath}" "${configFile}"`;

  // Versuche wt.exe (Windows Terminal), Fallback auf cmd
  const wtPath = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WindowsApps', 'wt.exe');
  let launchCmd;
  if (fs.existsSync(wtPath)) {
    launchCmd = `"${wtPath}" -d "${cwd}" --title "${title}" cmd /k "${nodeCmd}"`;
  } else {
    launchCmd = `start "${title}" cmd /k "cd /d "${cwd}" && ${nodeCmd}"`;
  }

  const child = exec(launchCmd, (err) => {
    if (err) {
      ccInstances.delete(instanceId);
      return json(res, 500, { error: 'CC-Start fehlgeschlagen: ' + err.message });
    }
    json(res, 200, {
      action: 'cc-started',
      cwd,
      worktree: isWorktree,
      branch: branchName,
      configPath: configFile,
      instanceId,
      mode: interactive !== false ? 'live+interactive' : 'live',
    });
  });
  // Store PID for stop capability
  if (child.pid) updateInstance(instanceId, { pid: child.pid });
}

// ══════════════════════════════════════
//  GIT STATUS PARSER
// ══════════════════════════════════════
function parseGitStatus(output) {
  let branch = '', ahead = 0, behind = 0;
  let modified = 0, staged = 0, untracked = 0;

  for (const line of output.split('\n')) {
    if (line.startsWith('# branch.head ')) {
      branch = line.slice(14).trim();
    } else if (line.startsWith('# branch.ab ')) {
      const m = line.match(/\+(\d+)\s+-(\d+)/);
      if (m) { ahead = parseInt(m[1]); behind = parseInt(m[2]); }
    } else if (line.startsWith('1 ') || line.startsWith('2 ')) {
      // Changed entry: XY format at position 2-3
      const xy = line.slice(2, 4);
      if (xy[0] !== '.') staged++;
      if (xy[1] !== '.') modified++;
    } else if (line.startsWith('? ')) {
      untracked++;
    }
  }

  const dirty = modified > 0 || untracked > 0 || staged > 0;
  const parts = [branch];
  if (dirty) parts[0] += ' ●'; else parts[0] += ' ✔';
  if (modified > 0) parts.push(modified + 'M');
  if (untracked > 0) parts.push(untracked + '?');
  if (staged > 0) parts.push(staged + 'S');
  if (ahead > 0) parts.push('↑' + ahead);
  if (behind > 0) parts.push('↓' + behind);
  const summary = parts.join(' ');

  return { branch, dirty, modified, untracked, staged, ahead, behind, summary };
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
      return json(res, 200, { status: 'ok', server: 'kanprompt-companion', version: '1.0.0', pid: process.pid, uptime: Math.floor(process.uptime()) });
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

    // ── START CC (Live Runner) ──
    if ((route === '/start-cc' || route === '/start-cc-worktree') && req.method === 'POST') {
      const { projectPath, promptFilePath, branchName, useWorktree, interactive, allowedTools } = await readBody(req);
      if (!projectPath) return json(res, 400, { error: 'projectPath required' });
      if (!promptFilePath) return json(res, 400, { error: 'promptFilePath required' });

      const resolved = path.resolve(projectPath);
      const promptAbsolute = path.resolve(promptFilePath);
      const promptInstruction = `Lies die Prompt-Datei ${promptAbsolute} und setze alle darin beschriebenen Aenderungen um.`;

      if (useWorktree && branchName) {
        const worktreeBase = resolved + '-worktrees';
        const branchSlug = branchName.replace(/\//g, '-');
        const worktreePath = path.join(worktreeBase, branchSlug);

        // Ensure worktree base dir exists
        if (!fs.existsSync(worktreeBase)) fs.mkdirSync(worktreeBase, { recursive: true });

        // Create worktree
        const wtCmd = `git -C "${resolved}" worktree add -b "${branchName}" "${worktreePath}"`;
        exec(wtCmd, (wtErr) => {
          if (wtErr) {
            // Branch might already exist — try without -b
            const wtCmd2 = `git -C "${resolved}" worktree add "${worktreePath}" "${branchName}"`;
            exec(wtCmd2, (wtErr2) => {
              if (wtErr2) return json(res, 500, { error: 'Worktree-Erstellung fehlgeschlagen: ' + wtErr2.message });
              launchCCLiveRunner(res, worktreePath, promptInstruction, branchName, true, interactive, allowedTools);
            });
            return;
          }
          launchCCLiveRunner(res, worktreePath, promptInstruction, branchName, true, interactive, allowedTools);
        });
      } else {
        launchCCLiveRunner(res, resolved, promptInstruction, null, false, interactive, allowedTools);
      }
      return;
    }

    // ── CC EVENT (from live-runner) ──
    if (route === '/cc-event' && req.method === 'POST') {
      const body = await readBody(req);
      const { instanceId, type } = body;
      if (!instanceId) return json(res, 400, { error: 'instanceId required' });
      const inst = ccInstances.get(instanceId);
      if (!inst) return json(res, 404, { error: 'Unknown instance: ' + instanceId });

      addInstanceEvent(instanceId, body);

      if (type === 'tool_use') {
        const toolInfo = body.tool + (body.file ? ': ' + body.file : '');
        updateInstance(instanceId, { lastTool: toolInfo });
        broadcastSSE({ type: 'tool-use', instanceId, tool: toolInfo });
      } else if (type === 'result') {
        updateInstance(instanceId, {
          status: 'done',
          sessionId: body.sessionId || inst.sessionId,
          cost: body.cost || null,
          duration: body.duration || null,
          finishedAt: new Date().toISOString(),
        });
        broadcastSSE({ type: 'instance-done', instance: ccInstances.get(instanceId) });
      } else if (type === 'error') {
        updateInstance(instanceId, {
          status: 'error',
          errorMessage: body.message || 'Unknown error',
          finishedAt: new Date().toISOString(),
        });
        broadcastSSE({ type: 'instance-error', instanceId, message: body.message });
      } else if (type === 'session_id') {
        updateInstance(instanceId, { sessionId: body.sessionId });
      } else if (type === 'pid') {
        updateInstance(instanceId, { pid: body.pid });
      }

      return json(res, 200, { ok: true });
    }

    // ── CC INSTANCES (snapshot) ──
    if (route === '/cc-instances' && req.method === 'GET') {
      const instances = Array.from(ccInstances.values());
      return json(res, 200, { instances });
    }

    // ── CC STATUS STREAM (SSE) ──
    if (route === '/cc-status-stream' && req.method === 'GET') {
      setCors(res);
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      // Send initial snapshot
      res.write('data: ' + JSON.stringify({ type: 'snapshot', instances: Array.from(ccInstances.values()) }) + '\n\n');
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return; // keep connection open
    }

    // ══════════════════════════════════════
    //  PROJECTS REGISTRY API
    // ══════════════════════════════════════
    let params;

    // ── GET /api/projects — Liste aller Projekte (Kurzform) ──
    if (route === '/api/projects' && req.method === 'GET') {
      const summary = {};
      for (const [id, proj] of Object.entries(registry.projects)) {
        summary[id] = { projectPath: proj.projectPath, mainBranch: proj.mainBranch };
      }
      return json(res, 200, { projects: summary });
    }

    // ── GET /api/projects/:id — Kompletter Projektdatensatz ──
    if ((params = matchRoute(route, '/api/projects/:id')) && req.method === 'GET') {
      const project = registry.projects[params.id];
      if (!project) return json(res, 404, { error: 'Projekt nicht gefunden: ' + params.id });
      return json(res, 200, { id: params.id, ...project });
    }

    // ── PUT /api/projects/:id — Projekt anlegen oder aktualisieren ──
    if ((params = matchRoute(route, '/api/projects/:id')) && req.method === 'PUT') {
      const body = await readBody(req);
      const id = params.id;
      const existing = registry.projects[id] || {};
      // Merge: body fields overwrite existing, but preserve cards/worktrees if not sent
      registry.projects[id] = {
        projectPath: body.projectPath || existing.projectPath || null,
        gitRemote: body.gitRemote || existing.gitRemote || null,
        worktreeBase: body.worktreeBase || existing.worktreeBase || null,
        mainBranch: body.mainBranch || existing.mainBranch || 'master',
        worktreeBaseDir: body.worktreeBaseDir || existing.worktreeBaseDir || null,
        promptsDir: body.promptsDir || existing.promptsDir || 'doc/prompts',
        versionFiles: body.versionFiles || existing.versionFiles || [],
        changelogFile: body.changelogFile || existing.changelogFile || 'CHANGELOG.md',
        branchPattern: body.branchPattern || existing.branchPattern || 'feature/{slug}',
        nextNum: body.nextNum != null ? body.nextNum : (existing.nextNum || 1),
        cards: existing.cards || [],
        cardPriority: existing.cardPriority || [],
        worktrees: existing.worktrees || [],
        lastSnapshotAt: existing.lastSnapshotAt || null,
      };
      saveRegistry();
      return json(res, 200, { action: existing.projectPath ? 'updated' : 'created', id });
    }

    // ── DELETE /api/projects/:id — Projekt entfernen ──
    if ((params = matchRoute(route, '/api/projects/:id')) && req.method === 'DELETE') {
      if (!registry.projects[params.id]) return json(res, 404, { error: 'Projekt nicht gefunden: ' + params.id });
      delete registry.projects[params.id];
      saveRegistry();
      return json(res, 200, { action: 'deleted', id: params.id });
    }

    // ── GET /api/projects/:id/cards — Alle Karten, optional ?status=new,in-progress ──
    if ((params = matchRoute(route, '/api/projects/:id/cards')) && req.method === 'GET') {
      const project = registry.projects[params.id];
      if (!project) return json(res, 404, { error: 'Projekt nicht gefunden: ' + params.id });
      let cards = project.cards || [];
      const qs = url.parse(req.url, true).query;
      if (qs.status) {
        const allowed = qs.status.split(',').map(s => s.trim());
        cards = cards.filter(c => allowed.includes(c.status));
      }
      return json(res, 200, { id: params.id, cards });
    }

    // ── GET /api/projects/:id/cards/:cardId — Einzelne Karte ──
    if ((params = matchRoute(route, '/api/projects/:id/cards/:cardId')) && req.method === 'GET') {
      const project = registry.projects[params.id];
      if (!project) return json(res, 404, { error: 'Projekt nicht gefunden: ' + params.id });
      const card = (project.cards || []).find(c => c.id === params.cardId);
      if (!card) return json(res, 404, { error: 'Karte nicht gefunden: ' + params.cardId });
      return json(res, 200, card);
    }

    // ── PUT /api/projects/:id/cards/:cardId — Karte anlegen oder aktualisieren ──
    if ((params = matchRoute(route, '/api/projects/:id/cards/:cardId')) && req.method === 'PUT') {
      const project = registry.projects[params.id];
      if (!project) return json(res, 404, { error: 'Projekt nicht gefunden: ' + params.id });
      if (!project.cards) project.cards = [];
      const body = await readBody(req);
      const idx = project.cards.findIndex(c => c.id === params.cardId);
      const cardData = {
        id: params.cardId,
        file: body.file || params.cardId + '.md',
        title: body.title || params.cardId,
        type: body.type || 'feature',
        num: body.num != null ? body.num : (idx >= 0 ? project.cards[idx].num : project.nextNum++),
        status: body.status || (idx >= 0 ? project.cards[idx].status : 'new'),
        timestamps: body.timestamps || (idx >= 0 ? project.cards[idx].timestamps : { new: nowISO(), 'in-progress': null, done: null, deleted: null }),
      };
      if (idx >= 0) {
        project.cards[idx] = cardData;
      } else {
        project.cards.push(cardData);
        if (!project.cardPriority) project.cardPriority = [];
        project.cardPriority.push(params.cardId);
      }
      saveRegistry();
      return json(res, 200, { action: idx >= 0 ? 'updated' : 'created', card: cardData });
    }

    // ── PATCH /api/projects/:id/cards/:cardId/status — Status-Transition ──
    if ((params = matchRoute(route, '/api/projects/:id/cards/:cardId/status')) && req.method === 'PATCH') {
      const project = registry.projects[params.id];
      if (!project) return json(res, 404, { error: 'Projekt nicht gefunden: ' + params.id });
      const card = (project.cards || []).find(c => c.id === params.cardId);
      if (!card) return json(res, 404, { error: 'Karte nicht gefunden: ' + params.cardId });
      const body = await readBody(req);
      if (!body.status) return json(res, 400, { error: 'status required' });

      const result = transitionCardStatus(card, body.status);
      if (result.error) return json(res, 400, result);

      writeDenormalizedStatus(project, card);
      saveRegistry();
      return json(res, 200, { action: 'transitioned', from: result.oldStatus, to: card.status, card });
    }

    // ── DELETE /api/projects/:id/cards/:cardId — Karte auf deleted setzen ──
    if ((params = matchRoute(route, '/api/projects/:id/cards/:cardId')) && req.method === 'DELETE') {
      const project = registry.projects[params.id];
      if (!project) return json(res, 404, { error: 'Projekt nicht gefunden: ' + params.id });
      const card = (project.cards || []).find(c => c.id === params.cardId);
      if (!card) return json(res, 404, { error: 'Karte nicht gefunden: ' + params.cardId });
      transitionCardStatus(card, 'deleted');
      writeDenormalizedStatus(project, card);
      saveRegistry();
      return json(res, 200, { action: 'deleted', card });
    }

    // ── PUT /api/projects/:id/card-priority — Reihenfolge neu setzen ──
    if ((params = matchRoute(route, '/api/projects/:id/card-priority')) && req.method === 'PUT') {
      const project = registry.projects[params.id];
      if (!project) return json(res, 404, { error: 'Projekt nicht gefunden: ' + params.id });
      const body = await readBody(req);
      if (!Array.isArray(body.cardPriority)) return json(res, 400, { error: 'cardPriority[] required' });
      project.cardPriority = body.cardPriority;
      saveRegistry();
      return json(res, 200, { action: 'priority-updated', cardPriority: project.cardPriority });
    }

    // ── GET /api/projects/:id/worktrees — Worktrees des Projekts ──
    if ((params = matchRoute(route, '/api/projects/:id/worktrees')) && req.method === 'GET') {
      const project = registry.projects[params.id];
      if (!project) return json(res, 404, { error: 'Projekt nicht gefunden: ' + params.id });
      return json(res, 200, { id: params.id, worktrees: project.worktrees || [] });
    }

    // ── PUT /api/projects/:id/worktrees/:branch — Worktree registrieren ──
    // Branch may contain slashes, so use regex match
    if (route.match(/^\/api\/projects\/[^/]+\/worktrees\/.+$/) && req.method === 'PUT') {
      const m = route.match(/^\/api\/projects\/([^/]+)\/worktrees\/(.+)$/);
      const projectId = decodeURIComponent(m[1]);
      const branch = decodeURIComponent(m[2]);
      const project = registry.projects[projectId];
      if (!project) return json(res, 404, { error: 'Projekt nicht gefunden: ' + projectId });
      if (!project.worktrees) project.worktrees = [];
      const body = await readBody(req);
      const idx = project.worktrees.findIndex(w => w.branch === branch);
      const wtData = {
        branch,
        path: body.path || null,
        cardId: body.cardId || null,
        status: body.status || 'pending',
        resumeChatId: body.resumeChatId || null,
        startedAt: body.startedAt || null,
        lastActivityAt: body.lastActivityAt || null,
        runtime: body.runtime || 0,
        cost: body.cost || 0.0,
        error: body.error || null,
      };
      if (idx >= 0) {
        Object.assign(project.worktrees[idx], wtData);
      } else {
        project.worktrees.push(wtData);
      }
      saveRegistry();
      return json(res, 200, { action: idx >= 0 ? 'updated' : 'registered', worktree: wtData });
    }

    // ── DELETE /api/projects/:id/worktrees/:branch — Worktree entfernen ──
    if (route.match(/^\/api\/projects\/[^/]+\/worktrees\/.+$/) && req.method === 'DELETE') {
      const m = route.match(/^\/api\/projects\/([^/]+)\/worktrees\/(.+)$/);
      const projectId = decodeURIComponent(m[1]);
      const branch = decodeURIComponent(m[2]);
      const project = registry.projects[projectId];
      if (!project) return json(res, 404, { error: 'Projekt nicht gefunden: ' + projectId });
      const idx = (project.worktrees || []).findIndex(w => w.branch === branch);
      if (idx < 0) return json(res, 404, { error: 'Worktree nicht gefunden: ' + branch });
      project.worktrees.splice(idx, 1);
      saveRegistry();
      return json(res, 200, { action: 'removed', branch });
    }

    // ── POST /api/projects/:id/snapshot — Snapshot erzeugen ──
    if ((params = matchRoute(route, '/api/projects/:id/snapshot')) && req.method === 'POST') {
      const result = createSnapshot(params.id);
      if (result.error) return json(res, 400, result);
      return json(res, 200, { action: 'snapshot-created', path: result.path });
    }

    // ── Doppelstart-Schutz (Helper, wird von /start-cc genutzt) ──
    // Check: GET /api/projects/:id/worktrees already handles listing;
    // double-start check is done inline in the response

    // ── WORKTREE LIST ──
    if (route === '/worktree-list' && req.method === 'POST') {
      const { projectPath } = await readBody(req);
      if (!projectPath) return json(res, 400, { error: 'projectPath required' });
      const resolved = path.resolve(projectPath);
      exec(`git -C "${resolved}" worktree list --porcelain`, (err, stdout) => {
        if (err) return json(res, 500, { error: err.message });
        const worktrees = [];
        let current = {};
        for (const line of stdout.split('\n')) {
          if (line.startsWith('worktree ')) {
            if (current.path) worktrees.push(current);
            current = { path: line.slice(9).trim() };
          } else if (line.startsWith('HEAD ')) {
            current.head = line.slice(5).trim();
          } else if (line.startsWith('branch ')) {
            current.branch = line.slice(7).trim().replace('refs/heads/', '');
          } else if (line === 'bare') {
            current.bare = true;
          } else if (line === '') {
            if (current.path) worktrees.push(current);
            current = {};
          }
        }
        if (current.path) worktrees.push(current);
        // Filter out the main worktree (first one is always main)
        const extra = worktrees.slice(1);
        json(res, 200, { worktrees: extra, main: worktrees[0] || null });
      });
      return;
    }

    // ── WORKTREE REMOVE ──
    if (route === '/worktree-remove' && req.method === 'POST') {
      const { worktreePath, force } = await readBody(req);
      if (!worktreePath) return json(res, 400, { error: 'worktreePath required' });
      const forceFlag = force ? ' --force' : '';
      exec(`git worktree remove "${path.resolve(worktreePath)}"${forceFlag}`, (err) => {
        if (err) return json(res, 500, { error: err.message });
        json(res, 200, { action: 'worktree-removed', path: worktreePath });
      });
      return;
    }

    // ── WORKTREE MERGE ──
    if (route === '/worktree-merge' && req.method === 'POST') {
      const { worktreePath, targetBranch } = await readBody(req);
      if (!worktreePath) return json(res, 400, { error: 'worktreePath required' });
      const resolved = path.resolve(worktreePath);
      // Get branch name from worktree
      exec(`git -C "${resolved}" rev-parse --abbrev-ref HEAD`, (err, branchOut) => {
        if (err) return json(res, 500, { error: 'Branch nicht ermittelbar: ' + err.message });
        const branch = branchOut.trim();
        const target = targetBranch || 'master';
        // Find the main repo (parent of worktree base dir)
        exec(`git -C "${resolved}" rev-parse --git-common-dir`, (err2, commonDir) => {
          if (err2) return json(res, 500, { error: err2.message });
          const mainRepo = path.resolve(commonDir.trim(), '..');
          // Merge branch into target in main repo
          const mergeCmd = `git -C "${mainRepo}" checkout ${target} && git -C "${mainRepo}" merge ${branch} && git worktree remove "${resolved}"`;
          exec(mergeCmd, (mergeErr, mergeOut) => {
            if (mergeErr) return json(res, 500, { error: 'Merge fehlgeschlagen: ' + mergeErr.message });
            json(res, 200, { action: 'worktree-merged', branch, target, output: mergeOut.trim() });
          });
        });
      });
      return;
    }

    // ── PROJECT BACKLOG (load backlog from any project) ──
    if (route === '/project-backlog' && req.method === 'POST') {
      const { projectPath } = await readBody(req);
      if (!projectPath) return json(res, 400, { error: 'projectPath required' });
      const resolved = path.resolve(projectPath);
      const backlogFile = path.join(resolved, 'doc', 'prompts', 'backlog-priority.json');
      try {
        const raw = fs.readFileSync(backlogFile, 'utf-8');
        const data = JSON.parse(raw);
        return json(res, 200, {
          project: path.basename(resolved),
          projectPath: resolved,
          backlog: data.backlog || [],
          inProgress: data.inProgress || [],
        });
      } catch (e) {
        return json(res, 404, { error: 'Backlog nicht gefunden: ' + e.message });
      }
    }

    // ── GIT STATUS (single project) ──
    if (route === '/git-status' && req.method === 'POST') {
      const { projectPath } = await readBody(req);
      if (!projectPath) return json(res, 400, { error: 'projectPath required' });
      const resolved = path.resolve(projectPath);
      exec(`git -C "${resolved}" status --porcelain=v2 --branch`, (err, stdout) => {
        if (err) return json(res, 500, { error: err.message });
        const status = parseGitStatus(stdout);
        return json(res, 200, status);
      });
      return;
    }

    // ── GIT STATUS ALL (batch) ──
    if (route === '/git-status-all' && req.method === 'POST') {
      const { projectPaths } = await readBody(req);
      if (!projectPaths || !Array.isArray(projectPaths)) return json(res, 400, { error: 'projectPaths[] required' });
      const results = {};
      let pending = projectPaths.length;
      if (pending === 0) return json(res, 200, { results });
      projectPaths.forEach(pp => {
        const resolved = path.resolve(pp);
        exec(`git -C "${resolved}" status --porcelain=v2 --branch`, (err, stdout) => {
          if (err) {
            results[resolved] = { error: err.message };
          } else {
            results[resolved] = parseGitStatus(stdout);
          }
          if (--pending === 0) return json(res, 200, { results });
        });
      });
      return;
    }

    // ── CC STOP ──
    if (route === '/cc-stop' && req.method === 'POST') {
      const { instanceId } = await readBody(req);
      if (!instanceId) return json(res, 400, { error: 'instanceId required' });
      const inst = ccInstances.get(instanceId);
      if (!inst) return json(res, 404, { error: 'Unknown instance: ' + instanceId });
      if (inst.status !== 'running') return json(res, 400, { error: 'Instance not running' });

      // Try to kill the process tree
      const pid = inst.pid;
      if (pid) {
        try {
          // On Windows, use taskkill to kill the entire process tree
          exec(`taskkill /PID ${pid} /T /F`, () => {});
        } catch {}
      }

      updateInstance(instanceId, {
        status: 'error',
        errorMessage: 'Manuell gestoppt',
        finishedAt: new Date().toISOString(),
      });
      broadcastSSE({ type: 'instance-stopped', instanceId });
      return json(res, 200, { action: 'cc-stopped', instanceId });
    }

    // ── FOCUS WINDOW ──
    if (route === '/focus-window' && req.method === 'POST') {
      const { instanceId } = await readBody(req);
      if (!instanceId) return json(res, 400, { error: 'instanceId required' });
      const inst = ccInstances.get(instanceId);
      if (!inst) return json(res, 404, { error: 'Unknown instance: ' + instanceId });

      // Try to focus terminal window by title containing instanceId
      const psCmd = `powershell -NoProfile -Command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32 { [DllImport(\\\"user32.dll\\\")] public static extern bool SetForegroundWindow(IntPtr hWnd); }'; Get-Process | Where-Object { $_.MainWindowTitle -match '${instanceId.replace(/'/g, "''")}' } | ForEach-Object { [Win32]::SetForegroundWindow($_.MainWindowHandle) }"`;
      exec(psCmd, (err) => {
        if (err) {
          // Fallback: return info for manual resume
          return json(res, 200, {
            action: 'focus-fallback',
            instanceId,
            sessionId: inst.sessionId,
            cwd: inst.cwd,
          });
        }
        return json(res, 200, { action: 'window-focused', instanceId });
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
        server: 'kanprompt-companion', version: '1.0.0',
        searchPaths: PROJECT_SEARCH_PATHS,
        endpoints: [
          'GET  /ping', 'GET  /info',
          'POST /find-project         {name}',
          'POST /open-editor          {filePath, line?}',
          'POST /open-terminal        {dirPath, command?}',
          'POST /claude-code          {projectPath, prompt?}',
          'POST /start-cc             {projectPath, promptFilePath, branchName?, useWorktree?, interactive?, allowedTools?}',
          'POST /start-cc-worktree    (alias for /start-cc)',
          'POST /open-folder          {dirPath}',
          'POST /cc-event             {instanceId, type, ...}',
          'GET  /cc-instances         → all instances',
          'GET  /cc-status-stream     → SSE live stream',
          'POST /worktree-list        {projectPath}',
          'POST /worktree-remove      {worktreePath, force?}',
          'POST /worktree-merge       {worktreePath, targetBranch?}',
          'POST /project-backlog      {projectPath}',
          'POST /git-status           {projectPath}',
          'POST /git-status-all       {projectPaths[]}',
          'POST /cc-stop              {instanceId}',
          'POST /focus-window         {instanceId}',
          '── Projects Registry API ──',
          'GET    /api/projects                           → alle Projekte',
          'GET    /api/projects/:id                       → Projektdetails',
          'PUT    /api/projects/:id                       → Projekt anlegen/aktualisieren',
          'DELETE /api/projects/:id                       → Projekt entfernen',
          'GET    /api/projects/:id/cards                 → Karten (?status=new,in-progress)',
          'GET    /api/projects/:id/cards/:cardId         → einzelne Karte',
          'PUT    /api/projects/:id/cards/:cardId         → Karte anlegen/aktualisieren',
          'PATCH  /api/projects/:id/cards/:cardId/status  → Status-Transition',
          'DELETE /api/projects/:id/cards/:cardId         → Karte löschen (soft)',
          'PUT    /api/projects/:id/card-priority         → Sortierung setzen',
          'GET    /api/projects/:id/worktrees             → Worktrees',
          'PUT    /api/projects/:id/worktrees/:branch     → Worktree registrieren',
          'DELETE /api/projects/:id/worktrees/:branch     → Worktree entfernen',
          'POST   /api/projects/:id/snapshot              → Snapshot erzeugen',
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
  │  KanPrompt Companion  v1.0.0         │
  │  http://${HOST}:${PORT}               │
  │                                      │
  │  Endpoints:                          │
  │    GET  /ping            health      │
  │    GET  /info            help        │
  │    POST /find-project    resolve     │
  │    POST /open-editor     Editor     │
  │    POST /open-terminal   terminal    │
  │    POST /claude-code     Claude CC   │
  │    POST /start-cc        Live CC    │
  │    POST /open-folder     Explorer    │
  │    POST /cc-event        Events     │
  │    GET  /cc-instances    Status     │
  │    GET  /cc-status-stream SSE       │
  │    POST /worktree-*      Worktrees  │
  │    POST /project-backlog Backlog    │
  │    POST /git-status      Git       │
  │    POST /cc-stop         Stop CC   │
  │    POST /focus-window    Focus     │
  │                                      │
  │  Press Ctrl+C to stop               │
  └──────────────────────────────────────┘
  `);
});
