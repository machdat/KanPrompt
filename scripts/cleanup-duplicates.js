#!/usr/bin/env node
// Einmaliges Cleanup: Entfernt Sync-Duplikate die durch den alten Frontend-Code
// nach der Migration erstellt wurden. Betrifft KanPrompt-Projekt.
//
// Verwendet die Companion-API (Server muss laufen auf Port 9177).
//
// Verwendung:
//   node scripts/cleanup-duplicates.js [--dry-run]

const http = require('http');

const dryRun = process.argv.includes('--dry-run');
const BASE = 'http://localhost:9177';

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = { hostname: url.hostname, port: url.port, path: url.pathname, method, headers: { 'Content-Type': 'application/json' } };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`${method} ${path} → ${res.statusCode}: ${data}`));
        resolve(JSON.parse(data));
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  // Alle Projekte laden
  const { projects } = await api('GET', '/api/projects');

  for (const [projectId, summary] of Object.entries(projects)) {
    const project = await api('GET', `/api/projects/${projectId}`);
    const cards = project.cards || [];
    if (cards.length === 0) continue;

    const originals = cards.filter(c => !/^\d{4}-/.test(c.id) && !/^\d{4}$/.test(c.id));
    const duplicates = cards.filter(c => /^\d{4}-/.test(c.id));

    if (duplicates.length === 0) continue;

    console.log(`\n=== Projekt: ${projectId} ===`);
    console.log(`  ${originals.length} Original-Karten, ${duplicates.length} Sync-Duplikate`);

    for (const dup of duplicates) {
      console.log(`  Entferne Duplikat: num=${dup.num} id="${dup.id}" file="${dup.file}"`);
    }

    if (!dryRun) {
      // Duplikate über API löschen
      for (const dup of duplicates) {
        await api('DELETE', `/api/projects/${projectId}/cards/${dup.id}`);
      }

      // cardPriority bereinigen (Duplikat-Nummern entfernen)
      const dupNums = new Set(duplicates.map(d => d.num));
      const cleanPriority = (project.cardPriority || []).filter(n => !dupNums.has(n));
      await api('PUT', `/api/projects/${projectId}/card-priority`, { cardPriority: cleanPriority });
    }

    console.log(`  ${duplicates.length} Duplikate ${dryRun ? 'würden' : ''} entfernt`);
  }

  if (dryRun) {
    console.log('\n[DRY RUN] Keine Änderungen vorgenommen.');
  } else {
    console.log('\nRegistry über Companion-API bereinigt.');
  }
}

main().catch(err => { console.error('Fehler:', err.message); process.exit(1); });
