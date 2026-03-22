#!/usr/bin/env node
// Einmaliges Migrationsskript: Karten-IDs von Slugs auf Nummern umstellen
// Liest projects-registry.json, benennt Dateien um und aktualisiert alle Referenzen.
//
// Verwendung:
//   node scripts/migrate-card-ids.js [--dry-run]

const fs = require('fs');
const path = require('path');

const dryRun = process.argv.includes('--dry-run');
const REGISTRY_FILE = path.join(__dirname, '..', 'companion', 'projects-registry.json');

function padNum(n) {
  return String(n).padStart(4, '0');
}

if (!fs.existsSync(REGISTRY_FILE)) {
  console.error('Registry nicht gefunden:', REGISTRY_FILE);
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
let totalRenamed = 0, totalUpdated = 0;

for (const [projectId, project] of Object.entries(registry.projects || {})) {
  console.log(`\n=== Projekt: ${projectId} ===`);
  const promptsDir = project.projectPath && project.promptsDir
    ? path.join(project.projectPath, project.promptsDir)
    : null;

  // Build slug→num lookup for blockedBy resolution
  const slugToNum = {};
  for (const card of (project.cards || [])) {
    slugToNum[card.id] = card.num;
  }

  for (const card of (project.cards || [])) {
    const oldId = card.id;
    const oldFile = card.file;
    const num = card.num;
    const padded = padNum(num);

    // Skip if already migrated (id is already a padded number)
    if (/^\d{4}$/.test(oldId)) {
      console.log(`  #${padded} — bereits migriert, übersprungen`);
      continue;
    }

    // New id = padded number
    card.id = padded;

    // New filename = NNNN-slug.md (slug from old id)
    const newFile = padded + '-' + oldId + '.md';
    card.file = newFile;

    console.log(`  #${padded}: id "${oldId}" → "${padded}", file "${oldFile}" → "${newFile}"`);
    totalUpdated++;

    // Rename physical file
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

    // Convert blockedBy from slug to number
    if (card.blockedBy && typeof card.blockedBy === 'string' && !/^\d+$/.test(card.blockedBy)) {
      const blockedNum = slugToNum[card.blockedBy];
      if (blockedNum != null) {
        console.log(`    blockedBy: "${card.blockedBy}" → ${blockedNum}`);
        card.blockedBy = blockedNum;
      } else {
        console.log(`    Warnung: blockedBy "${card.blockedBy}" — referenzierte Karte nicht gefunden`);
      }
    }
  }

  // Convert cardPriority from slugs to numbers
  if (project.cardPriority && project.cardPriority.length > 0) {
    const oldPriority = [...project.cardPriority];
    project.cardPriority = oldPriority.map(entry => {
      // Already a number?
      if (typeof entry === 'number') return entry;
      const num = slugToNum[entry];
      if (num != null) return num;
      console.log(`    Warnung: cardPriority-Eintrag "${entry}" — Karte nicht gefunden`);
      return entry; // keep as-is if not found
    });
    console.log(`  cardPriority: ${oldPriority.length} Einträge konvertiert`);
  }

  // nextNum bleibt unverändert
  console.log(`  nextNum: ${project.nextNum} (unverändert)`);
}

if (dryRun) {
  console.log(`\n[DRY RUN] ${totalUpdated} Karten würden aktualisiert, ${totalRenamed} Dateien würden umbenannt.`);
  console.log('Registry wurde NICHT geschrieben.');
} else {
  registry.lastUpdated = new Date().toISOString().replace(/\.\d{3}Z$/, '').replace('T', 'T');
  const tmp = REGISTRY_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(registry, null, 2), 'utf-8');
  try {
    fs.renameSync(tmp, REGISTRY_FILE);
  } catch {
    try { fs.unlinkSync(REGISTRY_FILE); } catch {}
    fs.renameSync(tmp, REGISTRY_FILE);
  }
  console.log(`\n${totalUpdated} Karten aktualisiert, ${totalRenamed} Dateien umbenannt.`);
  console.log('Registry gespeichert:', REGISTRY_FILE);
}
