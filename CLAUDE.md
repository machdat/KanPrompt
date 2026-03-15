# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Was ist KanPrompt?

Ein standalone Kanban-Board (einzelne HTML-Datei) zur Verwaltung von Claude-Code-Prompts. Läuft lokal in Chrome/Edge via File System Access API — kein Build-System, keine Dependencies, kein Server nötig.

## Architektur

- **`kanprompt.html`** — Die gesamte App: HTML + CSS + JavaScript in einer Datei (~1400 Zeilen)
- **`companion/kanprompt-companion.js`** — Optionaler Node.js HTTP-Server (Port 9177) als Bridge für Desktop-Integration (VS Code, Terminal, Explorer, Claude Code starten)
- **`workflow/`** — Wiederverwendbare Vorlagen und Dokumentation für den Prompt-Workflow in anderen Projekten
- **`install/`** — PowerShell-Skripte zum Installieren/Updaten nach `~/.kanprompt/`

### Datenmodell

`backlog-priority.json` ist die Single Source of Truth mit drei Arrays: `backlog`, `inProgress`, `done`. Jeder Eintrag referenziert eine Markdown-Datei in `new/`, `in-progress/`, `done/` oder `deleted/`. Timestamps im Format `YYYY-MM-DDTHH:MM:SS`.

### Schema-Versionierung

`workflow/schema.json` ist die Quelle der Wahrheit für das aktuelle Schema (JSON-Felder, Ordnerstruktur, Templates). Jedes Projekt-Repo hat eine `.kanprompt-version.json` im Root, die angibt auf welcher Schema- und App-Version es steht. Das Update-Script liest diese Datei und zeigt an ob Updates verfügbar sind.

### Wichtige Patterns im JavaScript

- `loadJson()` / `writeJson()` — JSON lesen/schreiben
- `readMdFile()` / `createMdFile()` — Prompt-Dateien lesen/erstellen
- `syncFolderToJson()` — Erkennt neue/gelöschte Dateien und synchronisiert JSON
- `handleDrop()` — Drag & Drop zwischen Spalten mit Dateiverschiebung
- `renderBoard()` — Spalten neu zeichnen
- Auto-Polling alle 2 Sekunden erkennt externe Änderungen

## Installation & Entwicklung

```powershell
# Erstinstallation (kopiert nach ~/.kanprompt/)
powershell -ExecutionPolicy Bypass -File install\install.ps1

# Update nach git pull
powershell -ExecutionPolicy Bypass -File install\update.ps1

# Companion-Server starten (optional)
node companion/kanprompt-companion.js
```

Kein Build-Prozess — Änderungen an `kanprompt.html` direkt im Browser mit F5 testen.

**Wichtig:** Änderungen an `kanprompt.html` erfordern einen Version-Bump in `const VERSION` (Zeile im `<script>`-Block). Danach `install\update.ps1` ausführen, damit die installierte Kopie unter `~/.kanprompt/` aktualisiert wird.

## Konventionen

- UI und Dokumentation sind auf Deutsch
- Prompt-Dateinamen: `{typ}-{kurzbeschreibung}.md` (Prefixe: `fix-`, `feat-`, `cleanup-`, `ux-`, `gui-`)
- Versionierung im CHANGELOG.md (Keep a Changelog Format)
- `_archive/` enthält das obsolete PowerShell-Board-System — nicht anfassen

## CC-Prompt Workflow

KanPrompt verwaltet seine eigene Entwicklung über `doc/prompts/`. Prompt-Dateien durchlaufen: `new/` → `in-progress/` → `done/` (oder `deleted/`).

### Nächstes Item abarbeiten

1. `doc/prompts/backlog-priority.json` lesen
2. Ersten Eintrag in `backlog` finden, bei dem `blocked` nicht `true` ist
3. **Task dem User zeigen und auf Bestätigung warten** — nicht eigenständig loslegen
4. Nach Bestätigung:
   - Prompt-Datei von `new/` nach `in-progress/` verschieben
   - Eintrag von `backlog` nach `inProgress` im JSON verschieben
   - `"inProgress": "YYYY-MM-DDTHH:MM:SS"` mit aktuellem Datum/Uhrzeit setzen
   - Implementierung beginnen
5. Nach Abschluss:
   - Session-Log an die Prompt-Datei anhängen (siehe unten)
   - Prompt-Datei von `in-progress/` nach `done/` verschieben
   - Eintrag von `inProgress` nach `done` im JSON verschieben
   - `"done": "YYYY-MM-DDTHH:MM:SS"` setzen

### Timestamp-Regeln

Ein Timestamp wird nur für einen State gesetzt, den der Prompt tatsächlich durchlaufen hat. Überspringt ein Prompt einen State (z.B. backlog → done), bleibt der übersprungene Timestamp leer.

- **→ inProgress:** `inProgress` = jetzt
- **→ done:** `done` = jetzt. `inProgress` NICHT nachträglich füllen.
- **→ backlog (zurück):** `inProgress` und `done` löschen (Clean Reset)
- **→ inProgress (zurück von done):** `done` löschen, `inProgress` = jetzt

### Session-Log (Pflicht nach Abschluss)

Nach Abschluss den Platzhalter-Abschnitt „Session-Log — Pflichtaufgabe" in der Prompt-Datei ersetzen durch:

```
---

# Session-Log

- **Datum:** YYYY-MM-DDTHH:MM:SS
- **Branch:** (Branch-Name)
- **Ergebnis:** Erfolgreich / Teilweise / Fehlgeschlagen

## Zusammenfassung
(1-3 Sätze)

## Geänderte Dateien
(Liste mit Kurzbeschreibung)

## Abweichungen vom Prompt
(Was abwich und warum, oder „Keine.")

## Offene Punkte
(Was offen blieb, oder „Keine.")
```

Vollständige Referenz: `workflow/CLAUDE-backlog-section.md`
