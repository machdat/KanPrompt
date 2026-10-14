#!/usr/bin/env node
// Einmaliges Migrationsskript: Karten-IDs von Slugs auf Nummern umstellen
// Liest Projektdaten über Companion-API, benennt Dateien um und aktualisiert Karten.
//
// Server muss laufen auf Port 9177.
//
// Verwendung:
//   node scripts/migrate-card-ids.js [--dry-run]

const fs = require('fs');
const path = require('path');
const http = require('http');

const dryRun = process.argv.includes('--dry-run');
const BASE = 'http://localhost:9177';

function padNum(n) {
  return String(n).padStart(4, '0');
}

function api(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(apiPath, BASE);
    const opts = { hostname: url.hostname, port: url.port, path: url.pathname, method, headers: { 'Content-Type': 'application/json' } };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`${method} ${apiPath} → ${res.statusCode}: ${data}`));
        resolve(JSON.parse(data));
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const { projects } = await api('GET', '/api/projects');
  let totalRenamed = 0, totalUpdated = 0, totalNumAssigned = 0;

  for (const [projectId] of Object.entries(projects)) {
    console.log(`\n=== Projekt: ${projectId} ===`);
    const project = await api('GET', `/api/projects/${projectId}`);
    const cards = project.cards || [];

    const promptsDir = project.projectPath && project.promptsDir
      ? path.join(project.projectPath, project.promptsDir)
      : null;

    // Build slug→num lookup for blockedBy resolution
    const slugToNum = {};
    for (const card of cards) {
      slugToNum[card.id] = card.num;
    }

    for (const card of cards) {
      const oldId = card.id;
      const oldFile = card.file;
      const num = card.num;
      const padded = padNum(num);

      // Skip if already migrated (id is already a padded number)
      if (/^\d{4}$/.test(oldId)) {
        console.log(`  #${padded} — bereits migriert, übersprungen`);
        continue;
      }

      // New id = padded number, new filename = NNNN-slug.md
      const newFile = padded + '-' + oldId + '.md';
      const updatedCard = { ...card, id: padded, file: newFile };

      // Convert blockedBy from slug to number
      if (updatedCard.blockedBy && typeof updatedCard.blockedBy === 'string') {
        const blockedNum = slugToNum[updatedCard.blockedBy];
        if (blockedNum != null) {
          console.log(`    blockedBy: "${updatedCard.blockedBy}" → ${blockedNum}`);
          updatedCard.blockedBy = blockedNum;
        }
      }

      console.log(`  #${padded}: id "${oldId}" → "${padded}", file "${oldFile}" → "${newFile}"`);

      if (!dryRun) {
        // Alte Karte löschen, neue anlegen (ID hat sich geändert)
        await api('DELETE', `/api/projects/${projectId}/cards/${oldId}`);
        await api('PUT', `/api/projects/${projectId}/cards/${padded}`, updatedCard);
      }
      totalUpdated++;

      // Rename physical file (filesystem-only, kein Registry-Zugriff)
      if (promptsDir) {
        const oldPath = path.join(promptsDir, oldFile);
        const newPath = path.join(promptsDir, newFile);
        if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
          if (dryRun) {
            console.log(`    [dry-run] würde umbenennen: ${oldFile} → ${newFile}`);
          } else {
            fs.renameSync(oldPath, newPath);
            console.log(`    Datei umbenannt: ${oldFile} → ${newFile}`);
          }
          totalRenamed++;
        } else if (!fs.existsSync(oldPath)) {
          console.log(`    Warnung: Datei nicht gefunden: ${oldPath}`);
        } else if (fs.existsSync(newPath)) {
          console.log(`    Warnung: Ziel existiert bereits: ${newPath}`);
        }
      }
    }

    // Convert cardPriority from slugs to numbers
    const oldPriority = project.cardPriority || [];
    if (oldPriority.length > 0) {
      const newPriority = oldPriority.map(entry => {
        if (typeof entry === 'number') return entry;
        const num = slugToNum[entry];
        if (num != null) return num;
        console.log(`    Warnung: cardPriority-Eintrag "${entry}" — Karte nicht gefunden, entfernt`);
        return null;
      }).filter(n => n != null);

      if (!dryRun) {
        await api('PUT', `/api/projects/${projectId}/card-priority`, { cardPriority: newPriority });
      }
      console.log(`  cardPriority: ${oldPriority.length} Einträge konvertiert`);
    }

    console.log(`  nextNum: ${project.nextNum}`);
  }

  if (dryRun) {
    console.log(`\n[DRY RUN] ${totalUpdated} Karten würden aktualisiert, ${totalRenamed} Dateien würden umbenannt.`);
  } else {
    console.log(`\n${totalUpdated} Karten aktualisiert, ${totalRenamed} Dateien umbenannt.`);
    console.log('Alle Änderungen über Companion-API gespeichert.');
  }
}

main().catch(err => { console.error('Fehler:', err.message); process.exit(1); });
