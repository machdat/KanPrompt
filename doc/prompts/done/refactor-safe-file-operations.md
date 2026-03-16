# Refactoring: Robustes Lesen und Schreiben mit der File System Access API

## Problem / Motivation

KanPrompt nutzt die File System Access API zum Lesen und Schreiben von Dateien. Seit Version 0.9.x treten systematisch `InvalidStateError`-Fehler auf, die das Schreiben (und damit Drag & Drop, Sync, neue Prompts) blockieren.

### Ursache

Chrome/Edge tracken intern den Modifikations-Zeitstempel jeder Datei. Wenn eine Datei **extern** geändert wird (durch CC, PowerShell, IDE, oder einen anderen Prozess) während KanPrompt einen File-Handle gecached hat, wirft `createWritable()` einen `InvalidStateError`:

```
"An operation that depends on state cached in an interface object was made
but the state had changed since it was read from disk."
```

In früheren Versionen (≤ v0.8.x) trat das nie auf, weil nur die App selbst in die Dateien geschrieben hat. Seit CC und externe Tools parallel schreiben, ist das Problem allgegenwärtig.

### Gescheiterte Lösungsversuche (v0.9.1 – v0.9.6)

Alle bisherigen Patches haben das Problem nicht gelöst, sondern verschoben:

1. **Handle-Refresh nach Fehler** (v0.9.3) — neue Handles sind genauso stale wenn die Datei extern geändert wurde
2. **Retry mit refreshHandles()** (v0.9.4) — gleicher Fehler beim Retry
3. **getFile() vor createWritable()** (v0.9.5) — synchronisiert den State nicht ausreichend
4. **Komplette Pfad-Traversierung** (v0.9.6) — sogar brandneue Handles vom projectHandle aus scheitern

### Aktueller Workaround (v0.9.7)

`writeJson()` löscht die Datei und erstellt sie neu (`removeEntry` + `getFileHandle({create:true})`). Das funktioniert, birgt aber **Datenverlust-Risiko**: Ein Crash zwischen Löschen und Neuschreiben verliert die komplette JSON.

## Ziel

Ein sauberes, durchdachtes Lese-/Schreib-Pattern das:

1. **Immer funktioniert** — auch wenn Dateien extern geändert wurden
2. **Kein Datenverlust** — bei Crash, Stromausfall oder Fehler bleibt die letzte gültige Version erhalten
3. **Einfach und verständlich** — ein Pattern, das überall konsistent angewendet wird
4. **Performance** — kein spürbarer Delay beim Schreiben oder Polling

## Betroffene Dateien

- `kanprompt.html` — Alle Datei-Operationen: `writeJson()`, `loadJson()`, `readMdFile()`, `writeMdFile()`, `createMdFile()`, `moveFile()`, `listMdFiles()`, Polling in `startPoll()`, `refreshFromDisk()`, `syncFolderToJson()`

## Soll-Zustand

### Architektur: Safe-Write-Pattern

Jede Schreib-Operation folgt diesem Muster:

```
1. Neuen Inhalt in eine TEMPORÄRE Datei schreiben  (z.B. .backlog-priority.json.tmp)
2. Alte Datei löschen
3. Temporäre Datei als neue Hauptdatei erstellen (Inhalt kopieren)
4. Temporäre Datei löschen
```

**Warum das sicher ist:**
- Schritt 1 schlägt fehl → alte Datei ist noch intakt
- Schritt 2 schlägt fehl → Temp-Datei + alte Datei existieren beide (Daten doppelt vorhanden)
- Schritt 3 schlägt fehl → Temp-Datei enthält noch die Daten, Recovery möglich
- Schritt 4 schlägt fehl → irrelevant, Cleanup beim nächsten Start

**Beim App-Start:** Wenn eine `.tmp`-Datei existiert, ist die letzte Schreib-Operation unterbrochen worden. Recovery: Temp-Datei als Hauptdatei übernehmen.

### Implementierung: `safeWriteFile(dirHandle, filename, content)`

Eine **zentrale Funktion** die das Safe-Write-Pattern kapselt:

```javascript
async function safeWriteFile(parentDirHandle, filename, content) {
  const tmpName = '.' + filename + '.tmp';

  // 1. Write to temp file (fresh handle, create:true → never stale)
  const tmpH = await parentDirHandle.getFileHandle(tmpName, { create: true });
  const tw = await tmpH.createWritable();
  await tw.write(content);
  await tw.close();

  // 2. Remove old file (may not exist on first write)
  try { await parentDirHandle.removeEntry(filename); } catch {}

  // 3. Write final file
  const fH = await parentDirHandle.getFileHandle(filename, { create: true });
  const fw = await fH.createWritable();
  await fw.write(content);
  await fw.close();

  // 4. Cleanup temp
  try { await parentDirHandle.removeEntry(tmpName); } catch {}

  return fH; // return the fresh handle for caching
}
```

### Implementierung: `safeDirHandle()`

Eine Hilfsfunktion die immer den **frischen** `prompts`-Directory-Handle zurückgibt:

```javascript
async function safeDirHandle() {
  const dH = await projectHandle.getDirectoryHandle('doc');
  return await dH.getDirectoryHandle('prompts');
}
```

### writeJson() — simpel und sicher

```javascript
async function writeJson() {
  const t = JSON.stringify(jsonData, null, 2) + '\n';
  const wasPolling = polling; polling = false;
  try {
    const pH = await safeDirHandle();
    jsonHandle = await safeWriteFile(pH, 'backlog-priority.json', t);
    dirHandle = pH;
    lastJsonText = t;
  } catch (e) {
    toast('Speichern fehlgeschlagen: ' + e.message);
    throw e;
  } finally {
    polling = wasPolling;
  }
}
```

### loadJson() — frisch traversieren, einfach lesen

```javascript
async function loadJson() {
  const pH = await safeDirHandle();
  const fH = await pH.getFileHandle('backlog-priority.json');
  const f = await fH.getFile();
  const t = await f.text();
  dirHandle = pH; jsonHandle = fH;
  lastJsonText = t; jsonData = JSON.parse(t);
}
```

### Polling — frisch traversieren, nur lesen

```javascript
pollInterval = setInterval(async () => {
  if (!projectHandle || !polling) return;
  try {
    const pH = await safeDirHandle();
    const fH = await pH.getFileHandle('backlog-priority.json');
    const f = await fH.getFile();
    const t = await f.text();
    dirHandle = pH; jsonHandle = fH;
    if (t !== lastJsonText) {
      jsonData = JSON.parse(t);
      lastJsonText = t;
      fileContentsCache = {};
      renderBoard(); updateInfoBar();
      toast('↻ Externe Änderung');
    }
  } catch {} // Polling-Fehler still ignorieren
}, 2000);
```

### Recovery beim Start

In `initProjectFromHandle()`, nach dem Aufbau der Verzeichnisstruktur:

```javascript
// Recovery: check for interrupted writes
try {
  const tmpH = await dirHandle.getFileHandle('.backlog-priority.json.tmp');
  const tmpF = await tmpH.getFile();
  const tmpContent = await tmpF.text();
  // Validate it's valid JSON before recovering
  JSON.parse(tmpContent);
  // Recover: write as main file
  const fH = await dirHandle.getFileHandle('backlog-priority.json', { create: true });
  const w = await fH.createWritable();
  await w.write(tmpContent); await w.close();
  await dirHandle.removeEntry('.backlog-priority.json.tmp');
  toast('⚠ Unterbrochene Speicherung wiederhergestellt');
} catch {
  // No temp file or invalid content — normal startup
}
```

### Alle anderen Schreib-Operationen

- **`writeMdFile(folder, filename, content)`** → nutzt `safeWriteFile(subDirs[folder], filename, content)`
- **`createMdFile(folder, filename, content)`** → kann direkt `getFileHandle({create:true})` + `createWritable()` nutzen (neue Datei = kein Stale-Problem)
- **`moveFile(filename, from, to)`** → Lesen aus Source (ist nur Lesen, kein Stale-Problem), dann `safeWriteFile` in Zielordner, dann `removeEntry` im Source-Ordner
- **`listMdFiles(folder)`** → nutzt `safeDirHandle()` + `getDirectoryHandle(folder)` + `entries()` (nur Lesen)

### Aufräumen

Folgende Code-Artefakte aus v0.9.1–v0.9.7 entfernen:
- `refreshHandles()` — nicht mehr nötig, jede Operation traversiert selbst
- `syncFailCount` / `updateSyncWarning()` / Sync-Warning UI-Elemente — werden durch stabile Operationen überflüssig
- `forceSync()` — wird vereinfacht, nutzt einfach `safeDirHandle()` + `syncFolderToJson()`
- Alle Retry-Loops in Datei-Operationen — `safeWriteFile` hat keine Retries nötig weil es mit create:true arbeitet

## Constraints

- **Einzelne HTML-Datei** — kein Framework, kein Build-System
- **Kein Server nötig** — rein clientseitig (File System Access API)
- **projectHandle ist stabil** — vom Browser verwaltet, wird nie stale. Alle Operationen gehen von diesem Handle aus
- **create:true umgeht InvalidStateError** — das ist die zentrale Erkenntnis. `getFileHandle(name, {create:true})` + `createWritable()` wirft KEINEN InvalidStateError, weil es keine cached-state-Prüfung gibt bei Neuanlage
- **Version bumpen** auf 0.10.0 (Minor-Version-Sprung weil Architektur-Änderung)
- **Toast-Anzeigedauer** mindestens 5 Sekunden (aktuell 5s, beibehalten)
- **CHANGELOG.md** aktualisieren

## Verifikation

### Basis-Funktionalität
1. Projekt öffnen → Board lädt korrekt, **kein** "Speichern fehlgeschlagen" Toast
2. Drag & Drop innerhalb Backlog → Reihenfolge ändert sich, wird gespeichert
3. Drag & Drop zwischen Spalten → Datei wird verschoben, JSON aktualisiert
4. Neuer Prompt erstellen → Karte erscheint im Backlog
5. Prompt löschen → Karte verschwindet, Datei in deleted/

### Externe Änderungen
6. Datei extern erstellen in new/ → erscheint nach ≤15s im Backlog
7. JSON extern ändern (z.B. mit PowerShell) → Board aktualisiert nach ≤2s
8. Refresh-Button → Board wird sofort aktualisiert

### Robustheit
9. Browser-Tab neuladen (F5) → Projekt wird wiederhergestellt, alles funktioniert
10. Schnellzugriff auf letztes Projekt → kein Fehler
11. Console: keine `InvalidStateError` oder unbehandelte Exceptions
12. Keine `.tmp`-Dateien nach normalem Betrieb (werden aufgeräumt)
13. 50 Einträge in JSON → nach jedem Sync immer noch 50 (kein Datenverlust)

### Safe-Write
14. `.tmp`-Datei manuell in den Ordner legen → wird beim Startup als Recovery erkannt
15. Kein Datenverlust auch wenn der Tab während des Schreibens geschlossen wird

---

# Session-Log

- **Datum:** 2026-03-16T11:40:00
- **Branch:** master
- **Ergebnis:** Erfolgreich

## Zusammenfassung
Komplettes Architektur-Refactoring der File-I/O-Schicht. Neue zentrale Primitives `safeDirHandle()` (frische Traversierung) und `safeWriteFile()` (Temp-Datei → Delete → Final-Write). Alle Dateioperationen nutzen jetzt diese Primitives. Recovery-Logik beim Startup für unterbrochene Schreibvorgänge. `refreshHandles()` und Retry-Loops entfernt.

## Geänderte Dateien
- `kanprompt.html` — Neues Safe-Write-Pattern (`safeWriteFile`, `safeDirHandle`), alle File-Ops refactored, Recovery-Logik in `initProjectFromHandle`, `refreshHandles` entfernt, Version → 0.10.0
- `CHANGELOG.md` — v0.10.0 Eintrag

## Abweichungen vom Prompt
- `syncFailCount` und `updateSyncWarning()` beibehalten — nützlich als Indikator für echte Zugriffsprobleme (z.B. Permissions), auch wenn Stale-Handle-Fehler nicht mehr auftreten sollten

## Offene Punkte
Keine.
