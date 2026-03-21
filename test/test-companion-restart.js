/**
 * Test: Companion-Server Endpoints + Restart-Verhalten.
 *
 * Startet den Companion auf Test-Port 9178 (unabhängig vom Produktiv-Server).
 * Testet immer den AKTUELLEN Code, nicht einen bereits laufenden Server.
 *
 * Ausführen: node --test test/test-companion-restart.js
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const TEST_PORT = 9178;
const HOST = '127.0.0.1';
const COMPANION_DIR = path.join(__dirname, '..', 'companion');
const COMPANION_PATH = path.join(COMPANION_DIR, 'kanprompt-companion.js');

function makeRequest(urlPath, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const opts = { hostname: HOST, port: TEST_PORT, path: urlPath, method, timeout: 5000 };
    if (body) opts.headers = { 'Content-Type': 'application/json' };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', err => resolve({ error: err.code }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'TIMEOUT' }); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function startCompanion() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--no-deprecation', COMPANION_PATH], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: COMPANION_DIR,
      env: { ...process.env, COMPANION_PORT: String(TEST_PORT) },
    });

    let output = '';
    let errors = '';
    child.stdout.on('data', d => output += d.toString());
    child.stderr.on('data', d => errors += d.toString());

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Server-Start timeout (15s). Output: ' + output + ' Errors: ' + errors));
    }, 15000);

    const check = setInterval(() => {
      if (output.includes('Ctrl+C')) {
        clearInterval(check);
        clearTimeout(timeout);
        resolve(child);
      }
    }, 200);

    child.on('exit', (code) => {
      clearInterval(check);
      clearTimeout(timeout);
      reject(new Error(`Server beendet mit Code ${code}. Errors: ${errors}`));
    });
  });
}

describe('Companion Server Tests (Port ' + TEST_PORT + ')', () => {
  let companion = null;

  before(async () => {
    companion = await startCompanion();
  });

  after(() => {
    if (companion) companion.kill();
  });

  it('1. Server startet und antwortet auf /ping', async () => {
    const res = await makeRequest('/ping');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.server, 'kanprompt-companion');
    assert.ok(res.body.pid > 0);
    assert.ok(typeof res.body.uptime === 'number');
  });

  it('2. GET /projects liefert Array aus Registry', async () => {
    const res = await makeRequest('/projects');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.projects), 'projects ist ein Array');
    for (const p of res.body.projects) {
      assert.ok(p.name, 'Projekt hat name');
      assert.ok(p.path || p.error, 'Projekt hat path oder error');
    }
  });

  it('3. GET /api/projects liefert Registry-Objekt', async () => {
    const res = await makeRequest('/api/projects');
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.projects, 'object');
    assert.ok(!Array.isArray(res.body.projects));
  });

  it('4. GET /projects und GET /api/projects sind konsistent', async () => {
    const list = await makeRequest('/projects');
    const registry = await makeRequest('/api/projects');
    const listNames = list.body.projects.map(p => p.name).sort();
    const registryNames = Object.keys(registry.body.projects).sort();
    assert.deepStrictEqual(listNames, registryNames);
  });

  it('5. GET /info enthält kein searchPaths', async () => {
    const res = await makeRequest('/info');
    assert.equal(res.status, 200);
    assert.equal(res.body.searchPaths, undefined);
  });

  it('6. Kein stilles Überspringen von Projekten', async () => {
    const list = await makeRequest('/projects');
    const registry = await makeRequest('/api/projects');
    assert.equal(list.body.projects.length, Object.keys(registry.body.projects).length);
  });

  it('7. Restart: Server killen und neu starten', async () => {
    companion.kill();
    await new Promise(r => setTimeout(r, 2000));

    // Verify dead
    const dead = await makeRequest('/ping');
    assert.ok(dead.error, 'Server muss nach kill unerreichbar sein');

    // Restart
    companion = await startCompanion();

    // Verify alive
    const alive = await makeRequest('/ping');
    assert.equal(alive.status, 200);
    assert.equal(alive.body.status, 'ok');
  });

  it('8. Nach Restart: Projekte persistent', async () => {
    const res = await makeRequest('/projects');
    assert.equal(res.status, 200);
    assert.ok(res.body.projects.length > 0, 'Projekte nach Restart vorhanden');
  });
});
