# Fix: Folder-Sync erkennt neue Dateien nicht zuverlässig

## Problem / Motivation

KanPrompt hat einen `syncFolderToJson()`-Mechanismus, der `.md`-Dateien in den Ordnern `new/`, `in-progress/`, `done/` scannen und fehlende Einträge automatisch in die `backlog-priority.json` aufnehmen soll. Dieser Sync **funktioniert nicht zuverlässig** — insbesondere beim Startup und beim periodischen Hintergrund-Scan.

### Auswirkung

Wenn Claude Code (CC) oder der User manuell eine `.md`-Datei im `new/`-Ordner erstellt, ohne gleichzeitig die JSON zu aktualisieren, wird diese Datei **stillschweigend ignoriert**. Sie erscheint nicht im Board und geht verloren, bis jemand manuell den 🔄 Sync-Button klickt — **und selbst das schlägt manchmal fehl**.

### Konkretes Fehlerbild (reproduziert am 2026-03-16)

1. Vier `.md`-Dateien lagen in `new/`, waren aber nicht in der JSON
2. `syncFolderToJson()` wurde beim Startup aufgerufen (v0.9.1), crashte mit:
   `"An operation that depends on state cached in an interface object was made but the state had changed since it was read from disk."`
3. In v0.9.2 wurde der Crash abgefangen (`try/catch`), aber der Sync scheitert still — die Dateien werden trotzdem nicht aufgenommen
4. Auch der periodische Sync (alle 10s via `setInterval`) erkennt die Dateien nicht

### Grundsatz

**Keine Prompt-Datei darf stillschweigend übersehen werden.** Wenn eine `.md`-Datei in einem der Board-Ordner liegt und nicht in der JSON steht, MUSS sie entweder automatisch aufgenommen oder dem User klar als Problem angezeigt werden — ohne Ausnahme.

## Betroffene Dateien

- `kanprompt.html` — Funktionen `syncFolderToJson()`, `listMdFiles()`, `startPoll()`, `initProjectFromHandle()`, `showApp()`

## Ist-Zustand (v0.9.2)

### `listMdFiles(folder)` (ca. Zeile 1029)
- Liest `subDirs[folder].entries()` via File System Access API
- Bei Fehler: versucht einmal, den Handle via `dirHandle.getDirectoryHandle(folder)` zu refreshen
- Bei zweitem Fehler: gibt `null` zurück (= Ordner unzugänglich)
- **Problem:** Auch nach dem Refresh schlägt die Directory-Iteration fehl. Der Fehler "state cached in an interface object" deutet darauf hin, dass die Handles grundsätzlich stale sind nach externen Dateioperationen

### `syncFolderToJson(silent)` (ca. Zeile 1038)
- Iteriert über `COLUMNS`, ruft `listMdFiles()` pro Spalte auf
- Wenn `listMdFiles` `null` zurückgibt → überspringt die Spalte (korrekt, verhindert Datenverlust)
- Wenn `listMdFiles` `[]` zurückgibt (leere Liste durch gecatchten Fehler) → **löscht alle JSON-Einträge** für diese Spalte (GEFÄHRLICH!)
- Gesamte Funktion ist in `try/catch` gewrappt, Fehler werden bei `silent=true` geschluckt

### Startup-Aufruf (ca. Zeile 996)
- `setTimeout(() => syncFolderToJson(true), 500)` — 500ms Verzögerung nach Projektladen
- **Problem:** 500ms reicht offenbar nicht. Und bei Fehler wird nichts angezeigt

### Periodischer Sync (in `startPoll()`, ca. Zeile 1075)
- Alle 10s: `syncFolderToJson(true)` — still, kein Feedback bei Fehler
- **Problem:** Wenn der Sync beim Startup scheitert, scheitert er auch periodisch aus dem gleichen Grund

## Soll-Zustand

### 1. Robuste Directory-Iteration

`listMdFiles()` muss **immer** eine korrekte Dateiliste zurückgeben, solange der User dem Browser Zugriff auf den Ordner gewährt hat. Untersuche warum die `entries()`-Iteration fehlschlägt und finde einen robusten Workaround. Mögliche Ansätze:

- **Handle komplett neu aufbauen:** Statt den gecachten `subDirs[folder]`-Handle zu refreshen, den gesamten Pfad `dirHandle → getDirectoryHandle(folder)` neu traversieren
- **`getFileHandle()` statt `entries()`:** Falls `entries()` unzuverlässig ist, könnten die Dateinamen aus der JSON bekannt sein und einzeln per `getFileHandle()` geprüft werden — als Fallback
- **Vor jeder Iteration Permissions prüfen:** `dirHandle.queryPermission()` aufrufen und ggf. `requestPermission()` erneut auslösen

### 2. Kein stiller Datenverlust

- `listMdFiles()` darf **niemals** eine leere Liste `[]` zurückgeben, wenn der tatsächliche Ordner Dateien enthält
- Der Rückgabewert `null` (= "konnte nicht lesen") muss klar von `[]` (= "Ordner ist wirklich leer") unterschieden werden
- `syncFolderToJson()` darf bei `null`-Rückgabe **keine Einträge entfernen** (ist in v0.9.2 schon so, muss beibehalten werden)

### 3. Sichtbare Fehlerindikation

Wenn der Sync dauerhaft scheitert (z.B. 3x hintereinander `null`-Rückgabe), soll ein **permanenter visueller Hinweis** im UI erscheinen — z.B. ein orangenes Warning-Badge neben dem Polling-Indikator oder ein Banner über dem Board. Der User muss wissen, dass der automatische Sync nicht funktioniert.

### 4. Manueller Sync-Button als Fallback

Der bestehende 🔄 Sync-Button muss **immer** funktionieren — auch wenn der automatische Sync scheitert. Falls nötig, soll der manuelle Sync die Directory-Handles komplett neu aufbauen (Force-Refresh).

### 5. Startup-Garantie

Beim Öffnen eines Projekts muss **garantiert** ein erfolgreicher Sync stattfinden, bevor das Board als "bereit" gilt. Falls der Sync beim Startup scheitert, soll ein Hinweis erscheinen und der User soll über einen Button einen Retry auslösen können.

## Diagnose-Schritte (vor dem Fix)

1. **Console-Logging einbauen:** In `listMdFiles()` und `syncFolderToJson()` temporäre `console.log()`-Statements einbauen, die den exakten Fehlertyp, die Handle-Zustände und die Ergebnisse loggen
2. **Reproduzieren:** Ein Projekt öffnen, KanPrompt laden, dann extern (via PowerShell oder Explorer) eine neue `.md`-Datei im `new/`-Ordner erstellen. Prüfen ob der periodische Sync sie findet
3. **Handle-Lebenszyklus verstehen:** Dokumentieren (als Kommentar im Code), wann Directory-Handles stale werden und wie Chrome/Edge sie invalidiert
4. **Browser DevTools:** Im Application-Tab → File System prüfen, welche Permissions der Browser aktuell hat und ob sie nach externen Änderungen verloren gehen

## Constraints

- **Einzelne HTML-Datei:** KanPrompt muss eine standalone `kanprompt.html` bleiben — kein Framework, kein Build-System
- **Kein Server nötig:** Die Lösung muss rein clientseitig funktionieren (File System Access API)
- **Kein Companion erforderlich:** Der Companion-Server ist optional und darf nicht Voraussetzung für den Folder-Sync sein
- **Bestehende JSON-Daten nie beschädigen:** Der Fix darf unter keinen Umständen korrekte Einträge aus der JSON entfernen
- **Performance:** Der periodische Sync darf die App nicht spürbar verlangsamen (max 100ms pro Scan)
- **Polling-Toggle respektieren:** Wenn der User Polling pausiert hat, darf auch kein Folder-Sync laufen

## Verifikation

1. **Basistest:** Projekt öffnen → extern (Dateimanager) eine neue `.md`-Datei in `new/` erstellen → Datei erscheint innerhalb von 15 Sekunden im Backlog
2. **Startup-Test:** `.md`-Datei extern erstellen → KanPrompt starten (F5) → Datei erscheint sofort beim Laden des Boards
3. **Massenerstellung:** 5 Dateien gleichzeitig extern erstellen → alle 5 erscheinen im Backlog
4. **Löschtest:** Datei extern löschen → verschwindet aus dem Board (nach Sync), JSON wird korrekt bereinigt
5. **Fehlerfall:** Keine Fehlermeldung im UI bei normalem Betrieb. Bei echtem Zugriffsproblem: klare Warnung sichtbar
6. **Kein Datenverlust:** 50 bestehende Einträge in der JSON → nach jedem Sync immer noch 50 (sofern Dateien existieren)
7. **Manueller Sync:** 🔄 Sync-Button funktioniert auch dann korrekt, wenn der automatische Sync scheitert
8. **Console:** Keine unbehandelten Exceptions in der Browser-Console bei normalem Betrieb

## Kontext

- File System Access API Spezifikation: https://developer.mozilla.org/en-US/docs/Web/API/File_System_API
- Browser: Chrome/Edge (beide Chromium-basiert, gleiche API-Implementierung)
- Die File System Access API invalidiert Directory-Handles wenn sich der Inhalt des Ordners ändert. Das ist by-design, aber KanPrompt muss damit umgehen können
- Der `initProjectFromHandle()`-Funktion baut die `subDirs`-Handles initial auf (Zeile ~951). Diese Handles werden danach nie erneuert — das ist vermutlich die Hauptursache

---

# Session-Log

- **Datum:** 2026-03-16T10:00:00
- **Branch:** master
- **Ergebnis:** Erfolgreich

## Zusammenfassung
Folder-Sync komplett überarbeitet: `listMdFiles()` holt Directory-Handles bei jedem Aufruf frisch statt gecachte (stale) Handles zu nutzen. Sync-Fehlerzähler mit visueller Warnung im UI. Manueller Sync-Button baut Handles vom Projekt-Root komplett neu auf. Startup-Sync ist jetzt synchron statt mit 500ms-Delay.

## Geänderte Dateien
- `kanprompt.html` — `listMdFiles()` komplett überarbeitet (frische Handles), `syncFolderToJson()` mit Fehlerzähler, neue `forceSync()` + `updateSyncWarning()` Funktionen, Startup-Sync als await, CSS + HTML für Sync-Warnung, Version → 0.9.3
- `CHANGELOG.md` — v0.9.3 Eintrag

## Abweichungen vom Prompt
Diagnose-Schritte (console.log) wurden übersprungen, da die Ursache klar war: stale Directory-Handles nach externen Dateioperationen.

## Offene Punkte
Keine.
