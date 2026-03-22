#!/usr/bin/env node
// Einmaliges Cleanup: Entfernt Sync-Duplikate die durch den alten Frontend-Code
// nach der Migration erstellt wurden. Betrifft KanPrompt-Projekt.
//
// Verwendung:
//   node scripts/cleanup-duplicates.js [--dry-run]

const fs = require('fs');
const path = require('path');

const dryRun = process.argv.includes('--dry-run');
const REGISTRY_FILE = path.join(__dirname, '..', 'companion', 'projects-registry.json');

if (!fs.existsSync(REGISTRY_FILE)) {
  console.error('Registry nicht gefunden:', REGISTRY_FILE);
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));

for (const [projectId, project] of Object.entries(registry.projects || {})) {
  if (!project.cards || project.cards.length === 0) continue;

  // Find original cards (old slug-based ids) and sync-duplicates (NNNN-slug ids)
  const originals = project.cards.filter(c => !/^\d{4}-/.test(c.id) && !/^\d{4}$/.test(c.id));
  const duplicates = project.cards.filter(c => /^\d{4}-/.test(c.id));

  if (duplicates.length === 0) continue;

  console.log(`\n=== Projekt: ${projectId} ===`);
  console.log(`  ${originals.length} Original-Karten, ${duplicates.length} Sync-Duplikate`);

  // Build set of original filenames (after migration, files on disk are NNNN-slug.md)
  // Duplicates have id like "0001-setup-git-repo" and file like "0001-setup-git-repo.md"
  // These are cards the sync created because it found the renamed files

  for (const dup of duplicates) {
    console.log(`  Entferne Duplikat: num=${dup.num} id="${dup.id}" file="${dup.file}"`);
  }

  if (!dryRun) {
    // Remove duplicates from cards array
    project.cards = project.cards.filter(c => !/^\d{4}-/.test(c.id));

    // Remove duplicate nums from cardPriority
    const dupNums = new Set(duplicates.map(d => d.num));
    if (project.cardPriority) {
      project.cardPriority = project.cardPriority.filter(n => !dupNums.has(n));
    }

    // Reset nextNum to original value (before duplicates were created)
    // Find the max num among originals
    const maxOrigNum = Math.max(...originals.map(c => c.num), 0);
    if (project.nextNum > maxOrigNum + 1) {
      console.log(`  nextNum: ${project.nextNum} → ${maxOrigNum + 1}`);
      project.nextNum = maxOrigNum + 1;
    }
  }

  console.log(`  ${duplicates.length} Duplikate ${dryRun ? 'würden' : ''} entfernt`);
}

if (dryRun) {
  console.log('\n[DRY RUN] Registry wurde NICHT geschrieben.');
} else {
  registry.lastUpdated = new Date().toISOString().replace(/\.\d{3}Z$/, '');
  const tmp = REGISTRY_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(registry, null, 2), 'utf-8');
  try { fs.renameSync(tmp, REGISTRY_FILE); } catch {
    try { fs.unlinkSync(REGISTRY_FILE); } catch {}
    fs.renameSync(tmp, REGISTRY_FILE);
  }
  console.log('\nRegistry bereinigt und gespeichert.');
}
