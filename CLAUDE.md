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

## Konventionen

- UI und Dokumentation sind auf Deutsch
- Prompt-Dateinamen: `{typ}-{kurzbeschreibung}.md` (Prefixe: `fix-`, `feat-`, `cleanup-`, `ux-`, `gui-`)
- Versionierung im CHANGELOG.md (Keep a Changelog Format)
- `_archive/` enthält das obsolete PowerShell-Board-System — nicht anfassen

## Dogfooding

KanPrompt verwaltet seine eigene Entwicklung über `doc/prompts/`. Dort liegen die Backlog-Items und erledigten Prompts für KanPrompt selbst. Workflow-Details: `workflow/CLAUDE-backlog-section.md`.
