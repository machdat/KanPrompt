# Fix: Stale File Handles — Alle Handles müssen bei Bedarf refreshed werden

## Problem / Motivation

KanPrompt v0.9.3 hat den Folder-Sync teilweise verbessert (frische Directory-Handles in `listMdFiles()`), aber **zwei kritische Handle-Probleme bleiben:**

### Problem 1: `dirHandle` (doc/prompts/) ist stale

`listMdFiles(folder)` ruft `dirHandle.getDirectoryHandle(folder)` auf, aber `dirHandle` selbst (der Handle auf `doc/prompts/`) wird nie erneuert. Wenn sich der Ordnerinhalt extern ändert, wird `dirHandle` stale und alle Aufrufe schlagen fehl:

```
"An operation that depends on state cached in an interface object was made
but the state had changed since it was read from disk."
```

### Problem 2: `jsonHandle` (backlog-priority.json) ist stale

`writeJson()` nutzt `jsonHandle.createWritable()`. Dieser Handle wird in `initProjectFromHandle()` einmal gesetzt und danach nie erneuert — auch nicht in `forceSync()`. Wenn der Handle stale ist, schlägt **jede Schreib-Operation** fehl:

- Drag & Drop (Priorität ändern) → `writeJson()` crasht
- Karten verschieben (Spalte wechseln) → `writeJson()` crasht
- Sync neue Dateien aufnehmen → `writeJson()` crasht
- Neue Prompts erstellen → `writeJson()` crasht
- Blocked setzen/aufheben → `writeJson()` crasht

### Konkretes Fehlerbild (reproduziert am 2026-03-16 mit v0.9.3)

1. Projekt erju_wp27 öffnen → Board lädt korrekt
2. `⚠ Sync-Problem` Badge erscheint sofort (Sync scheitert still)
3. Externe JSON-Änderung wird als "↻ Externe Änderung" erkannt (Lesen funktioniert!)
4. Aber: Karten können nicht per Drag & Drop verschoben werden (Schreiben scheitert)
5. Manueller 🔄 Sync-Button → refresht Directory-Handles, aber nicht jsonHandle

## Betroffene Dateien

- `kanprompt.html` — Funktionen `writeJson()`, `listMdFiles()`, `forceSync()`, `loadJson()`, und alle Funktionen die `writeJson()` aufrufen

## Ist-Zustand (v0.9.3)

### Handle-Lebenszyklus

| Handle | Gesetzt in | Refreshed in | Problem |
|---|---|---|---|
| `projectHandle` | `openProject()` / IndexedDB | Nie (vom Browser verwaltet) | Bleibt stabil |
| `dirHandle` (doc/prompts/) | `initProjectFromHandle()` | `forceSync()` ✓ | **Nicht** in `listMdFiles()` |
| `subDirs[folder]` | `initProjectFromHandle()` | `listMdFiles()` ✓ / `forceSync()` ✓ | OK |
| `jsonHandle` | `initProjectFromHandle()` | **NIRGENDWO** ❌ | Kritisch! |

### `writeJson()` (Zeile ~1012)
```javascript
async function writeJson() {
  const t = JSON.stringify(jsonData, null, 2) + '\n';
  lastJsonText = t;
  const w = await jsonHandle.createWritable();  // ← CRASH wenn stale
  await w.write(t);
  await w.close();
}
```

### `loadJson()` (Zeile ~1002) — funktioniert weil `getFile()` robuster ist
```javascript
async function loadJson() {
  const f = await jsonHandle.getFile();  // getFile() toleriert stale handles besser
  const t = await f.text();
  lastJsonText = t; jsonData = JSON.parse(t);
}
```

## Soll-Zustand

### 1. Zentrale Handle-Refresh-Funktion

Eine neue Funktion `refreshHandles()` die **alle** Handles vom `projectHandle` aus komplett neu aufbaut:

```javascript
async function refreshHandles() {
  const docHandle = await projectHandle.getDirectoryHandle('doc');
  const promptsHandle = await docHandle.getDirectoryHandle('prompts');
  dirHandle = promptsHandle;
  jsonHandle = await dirHandle.getFileHandle('backlog-priority.json');
  for (const col of COLUMNS) {
    try { subDirs[col.folder] = await dirHandle.getDirectoryHandle(col.folder); }
    catch { subDirs[col.folder] = null; }
  }
  try { subDirs['deleted'] = await dirHandle.getDirectoryHandle('deleted'); }
  catch { subDirs['deleted'] = null; }
}
```

### 2. Auto-Refresh bei Fehler

`writeJson()` und `listMdFiles()` sollen bei einem Fehler **einmal** `refreshHandles()` aufrufen und den Vorgang wiederholen (Retry-Pattern). Nur beim zweiten Fehler abbrechen.

```javascript
async function writeJson() {
  const t = JSON.stringify(jsonData, null, 2) + '\n';
  lastJsonText = t;
  try {
    const w = await jsonHandle.createWritable();
    await w.write(t); await w.close();
  } catch (e) {
    // Handle stale — refresh and retry once
    await refreshHandles();
    const w = await jsonHandle.createWritable();
    await w.write(t); await w.close();
  }
}
```

### 3. `forceSync()` nutzt `refreshHandles()`

Statt duplizierten Code soll `forceSync()` die zentrale `refreshHandles()` aufrufen.

### 4. Kein `{ create: true }` in `refreshHandles()`

Beim Refresh dürfen keine Ordner oder Dateien angelegt werden. `{ create: true }` gehört nur in `initProjectFromHandle()` beim erstmaligen Öffnen.

### 5. Sync-Problem Badge verschwindet nach erfolgreichem forceSync

Aktuell setzt `forceSync()` schon `syncFailCount = 0`, aber das Badge muss auch nach einem Auto-Refresh (durch Retry-Pattern) zurückgesetzt werden.

## Constraints

- **Einzelne HTML-Datei** — kein Framework, kein Build-System
- **Kein Server nötig** — rein clientseitig (File System Access API)
- **Bestehende JSON-Daten nie beschädigen**
- **`projectHandle` nicht anfassen** — der wird vom Browser/IndexedDB verwaltet und ist stabil
- **Retry maximal 1x** — kein Endlos-Loop bei echten Permissions-Problemen
- **Performance** — `refreshHandles()` nur bei Fehler aufrufen, nicht bei jedem Zugriff

## Verifikation

1. **Drag & Drop Priorität:** Karte innerhalb Backlog nach oben/unten ziehen → neue Reihenfolge wird gespeichert
2. **Drag & Drop Spalte:** Karte von Backlog nach In Progress ziehen → Datei wird verschoben, JSON aktualisiert
3. **Manueller Sync:** 🔄 Sync-Button → Board wird aktualisiert, kein Fehler
4. **Automatischer Sync:** Extern Datei erstellen → erscheint innerhalb von 15s im Board
5. **Kein Sync-Problem Badge:** Bei normalem Betrieb (keine Dateien extern geändert) erscheint kein ⚠ Sync-Problem
6. **Neuer Prompt erstellen:** + Prompt Button → Modal → Erstellen → Karte erscheint im Backlog
7. **Blocked setzen:** Karte → ⊘ Button → Grund eingeben → Badge erscheint
8. **Delete:** Karte → ✕ → Bestätigen → Karte verschwindet, Datei in deleted/
9. **Console:** Keine unbehandelten Exceptions bei normalem Betrieb
10. **Nach externem Löschen:** Datei extern löschen → Karte verschwindet nach Sync, kein Crash

---

# Session-Log

- **Datum:** 2026-03-16T10:35:00
- **Branch:** master
- **Ergebnis:** Erfolgreich

## Zusammenfassung
Zentrale `refreshHandles()` Funktion eingeführt, die alle File System Handles vom stabilen `projectHandle` komplett neu aufbaut. Alle Datei-Operationen (`writeJson`, `loadJson`, `readMdFile`, `writeMdFile`, `moveFile`, `createMdFile`, `listMdFiles`) mit Retry-on-stale-Pattern ausgestattet. Sync-Warning als auffälliges Banner (volle Breite, orange, animiert) statt kleinem Text. Polling-Dot wird bei Sync-Problem orange.

## Geänderte Dateien
- `kanprompt.html` — Neue `refreshHandles()`, Retry-Pattern in allen File-Ops, Banner-Warning, Version → 0.9.4
- `CHANGELOG.md` — v0.9.4 Eintrag

## Abweichungen vom Prompt
Keine.

## Offene Punkte
Keine.
