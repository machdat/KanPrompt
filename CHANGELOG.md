# Changelog

All notable changes to KanPrompt will be documented in this file.

## [0.20.0] - 2026-03-20

### Added
- `dispatch.html` — Eigenständige Dispatch-Manager-Seite (Single-File-App wie kanprompt.html)
- Companion `GET /dispatch` — Liefert dispatch.html unter `http://127.0.0.1:9177/dispatch` aus
- Companion `GET /projects` — Listet KanPrompt-Projekte aus den Search-Paths auf
- Vollseiten-Layout: Auftrags-Queue, Add-Dialog, Git-Status-Sektion in eigenem Fenster
- 📊-Button in kanprompt.html öffnet Dispatch in eigenem Tab/Fenster (kein Duplikat dank `window.open` Name)
- Mini-Badge am 📊-Button zeigt Anzahl laufender CC-Instanzen

### Changed
- Companion-Server auf v0.9.0 (mit HTML-Serving)
- Dispatch-Overlay komplett aus kanprompt.html entfernt (~500 Zeilen CSS+JS+HTML)
- Dispatch-Queue-State lebt jetzt ausschließlich in dispatch.html (Variante B: Single Source of Truth)

### Removed
- Dispatch-Overlay in kanprompt.html (HTML, CSS, JS)
- "+ Dispatch"-Button im Preview-Panel

## [0.16.0] - 2026-03-19

### Added
- CC Live Runner: `cc-live-runner.js` zeigt Live-Output (stream-json) von Claude Code im Terminal
- Phase 2 Resume: Nach Prompt-Abschluss öffnet sich automatisch ein interaktives Terminal mit `--resume`
- Shift+Klick auf "⚡ CC" startet im Silent-Modus (kein Resume-Terminal)
- Neuer Companion-Endpoint `/start-cc` mit `interactive`- und `allowedTools`-Parameter
- Config-per-JSON: umgeht Windows-Quoting-Probleme komplett

### Changed
- Companion-Server auf v0.7.0
- `/start-cc-worktree` ist jetzt Alias für `/start-cc` (backward compat)
- Kein Clipboard-Hack mehr — CC bekommt den Prompt direkt via `-p`

## [0.14.0] - 2026-03-18

### Added
- "⚡ CC" Button im Preview-Panel: startet Claude Code direkt mit der Prompt-Datei
- Worktree-Checkbox: optional isolierter Git-Worktree pro Prompt (Default: an)
- Companion-Endpoint `/start-cc-worktree`: erstellt Worktree + startet CC
- Branch-Namensstrategie: `{type}/{id}` (z.B. `feature/cc-aus-kanprompt-antriggern`)

### Changed
- Companion-Server auf v0.6.0

## [0.13.0] - 2026-03-18

### Added
- Prompt-Typ pro Karte (bugfix/feature/release) mit farbigen Badges und Typ-Selector im Erstellungs-Modal
- Automatische Versionsberechnung beim Done-Drop mit Toast-Hinweis
- Versions-Plan-Anzeige in der Info-Bar (current → next)
- Eindeutige stabile Nummern pro Prompt-Karte (#1, #2, ...) mit nextNum-Counter
- Typ-Selektion direkt im Preview-Panel per klickbare Buttons

### Fixed
- Upgrade-Modal zeigt nach erfolgreichem Schema-Upgrade "✓ OK" statt "Abbrechen"
- Duplikat-Bug beim Erstellen von Prompts behoben (globaler ID-Check in syncFolderToJson)

### Changed
- Schema-Migration 1.0.0 → 1.1.0 (type-Feld) und 1.1.0 → 1.2.0 (num-Feld, nextNum-Counter)
- SCHEMA_VERSION auf 1.2.0

## [0.12.0] - 2026-03-18

### Added
- Deleted-Overlay: Gelöschte Prompts einsehen, durchsuchen, Vorschau, wiederherstellen oder endgültig löschen
- 🗑-Button in der Info-Bar mit Anzahl gelöschter Dateien
- Keyboard-Shortcut `D` öffnet/schließt das Deleted-Overlay
- Restore verschiebt Datei zurück nach `new/` und fügt Eintrag ins Backlog ein
- Endgültiges Löschen mit Bestätigungsdialog

## [0.11.0] - 2026-03-16

### Added
- Projekt-Kombifeld im Header: Dropdown mit Recent-Projekte-Liste statt separatem Wechsel-Button
- Klick auf Projektname öffnet Dropdown, "Anderes Projekt öffnen..." für Datei-Dialog

### Changed
- Projektname zeigt nicht mehr redundant `doc/prompts/`
- Editor-Button sagt "Editor" statt "VS Code"
- Companion-Server `/open-editor` nutzt System-Default-Editor direkt (statt VS Code mit Fallback)
- Ctrl+Shift+O öffnet Projekt-Dropdown statt Welcome-Screen

## [0.10.0] - 2026-03-16

### Changed
- **Architektur-Refactoring:** Neues Safe-Write-Pattern für alle Dateioperationen
- `safeWriteFile()` schreibt erst in `.tmp`, dann löscht alte Datei, dann finales Schreiben — kein Datenverlust bei Crash
- `safeDirHandle()` traversiert immer frisch von `projectHandle` — nie stale Handles
- `writeJson()` nutzt Safe-Write-Pattern statt delete+create
- `writeMdFile()` nutzt Safe-Write-Pattern
- `readMdFile()`, `moveFile()`, `createMdFile()`, `listMdFiles()` traversieren frisch via `safeDirHandle()`
- Polling und `refreshFromDisk()` traversieren frisch via `safeDirHandle()`
- `forceSync()` vereinfacht — keine Handle-Rebuild nötig
- `refreshHandles()` und Retry-Loops entfernt — nicht mehr nötig mit `create:true` Pattern

### Added
- Recovery beim App-Start: `.tmp`-Datei wird erkannt und als Hauptdatei wiederhergestellt
- Auffälliges Sync-Warning-Banner (volle Breite, orange, animiert) bei dauerhaften Sync-Problemen

## [0.9.3] - 2026-03-16

### Fixed
- Folder-Sync erkennt neue Dateien jetzt zuverlässig — Directory-Handles werden bei jedem Scan frisch geholt statt gecachte (stale) Handles zu nutzen
- Kein stiller Datenverlust mehr: `listMdFiles()` gibt `null` bei Fehler zurück, nie fälschlich `[]`
- Startup-Sync ist jetzt synchron (`await`) statt asynchronem `setTimeout(500ms)`
- Manueller 🔄 Sync-Button baut alle Directory-Handles komplett neu auf (Force-Refresh)

### Added
- Visueller Sync-Warnhinweis (⚠ Sync-Problem) im Header nach 3 aufeinanderfolgenden Sync-Fehlern
- Force-Sync Funktion: baut Handles vom Projekt-Root komplett neu auf

## [0.9.0] - 2026-03-15

### Added
- Schema-Version Badge im Header (grün = aktuell, gelb = veraltet, rot = fehlend)
- Upgrade-Modal mit Migrations-Registry für Schema-Updates
- Erste Migration: Timestamps YYYY-MM-DD → YYYY-MM-DDTHH:MM:SS, TEMPLATE.md + deleted/ sicherstellen
- `.kanprompt-version.json` wird nach Upgrade im Projekt-Root geschrieben

## [0.7.3] - 2026-03-15

### Added
- Add KanPrompt prompt workflow (dogfooding) with 5 backlog items and 4 done items
- Add schema versioning (v1.0.0) and CLAUDE.md
- Auto git pull in update.ps1 before deploying
- Replace Claude.ai button with Claude Desktop launcher

### Changed
- Update workflow docs to ISO timestamps with time-of-day

### Fixed
- Update Claude Desktop icon to ✨ and bump version to 0.7.3

## [0.7.2] - 2026-03-14

### Changed
- Remove dead title tooltips on draggable cards

## [0.7.1] - 2026-03-14

### Fixed
- Show date+time on all cards, e.g. 14.03. 16:45

## [0.7.0] - 2026-03-14

### Added
- Initial repo structure v0.6.7
- ISO timestamps with time-of-day, sorted done column

## [0.6.7] - 2026-03-14

### Changed
- Done column: newest entries on top, archive button at bottom

### Fixed
- Preview panel invisible due to saved 1px width (localStorage race condition during CSS transition)
- Validate saved preview width: ignore values below 200px
- Save width only when panel is fully open (>= 200px)

## [0.6.5] - 2026-03-14

### Added
- Toggle behavior: clicking same card closes preview
- Refresh button in detail view

### Fixed
- Timestamp rules for backward transitions (clean reset)
- No auto-fill of `inProgress` when skipping directly to Done

## [0.5.0] - 2026-03-13

### Added
- Companion server for desktop integration (VS Code, Claude Code, Explorer, Terminal)
- Resize handle on preview panel (width saved to localStorage)
- Blocked/unblocked workflow with reason field
- Date grouping in Done column (Heute / Diese Woche / Älter)
- Archive overlay for browsing all done items
- Inline Markdown editor with save/cancel

## [0.4.0] - 2026-03-12

### Added
- Drag & drop reordering within and between columns
- Drop indicator during drag
- New Prompt modal with auto-generated filename
- Delete with move to `deleted/` folder
- Folder ↔ JSON sync button

## [0.3.0] - 2026-03-11

### Added
- File System Access API for direct disk read/write
- Auto-polling with configurable interval
- Project memory via IndexedDB (recent projects list)
- Claude.ai project URL integration

## [0.1.0] - 2026-03-10

### Added
- Initial standalone HTML Kanban board
- Three columns: Backlog, In Progress, Done
- JSON as single source of truth (`backlog-priority.json`)
- Card preview panel with Markdown rendering
