# Changelog

All notable changes to KanPrompt will be documented in this file.

## [1.6.0] - 2026-03-22

### Added
- **Reconciliation bei Projektaktivierung**: Beim Öffnen eines Projekts vergleicht der Companion den Registry-Stand mit den real vorhandenen `.md`-Dateien auf Disk
- `GET /api/projects/:id/reconcile` — Nicht-destruktiver Abgleich, liefert `onDiskOnly` und `inRegistryOnly` Listen
- `POST /api/projects/:id/reconcile` — Auto-Sync: Neue Dateien als Karten anlegen, fehlende Karten als gelöscht markieren
- Differenz-Dialog im UI: Zeigt Abweichungen übersichtlich, bietet Auto-Sync oder manuelles Klären
- Dezenter Hinweis-Banner im Header (`⚠ Sync-Differenz`), klickbar zum erneuten Öffnen des Dialogs
- `README.md` wird vom Reconciliation-Scan ausgenommen
- Companion-Version auf v1.6.0, KanPrompt auf v0.25.0

## [1.5.0] - 2026-03-22

### Changed
- **Companion-Pflicht**: KanPrompt erfordert jetzt einen laufenden Companion-Server. Ohne Companion wird eine Blockade-Meldung mit Retry-Button angezeigt statt des bisherigen eingeschränkten Betriebs
- **Companion-Versions-Badge**: Das bisherige Schema-Badge im Header zeigt jetzt `companion X.Y.Z` statt `schema X.Y.Z`
- Companion-Version auf v1.5.0, KanPrompt auf v0.24.0

### Added
- `GET /api/version` Endpunkt im Companion (liefert `{ version, uptime }`)

### Removed
- **Schema-Migrationslogik komplett entfernt**: `SCHEMA_VERSION`, `MIGRATIONS`-Array, `getMigrationsNeeded()`, `updateSchemaBadge()`, `openUpgradeModal()`, `closeUpgradeModal()`, `performUpgrade()`
- Upgrade-Modal (`#upgradeModalOverlay`) und zugehörige CSS-Regeln (`.schema-badge.*`)
- Lesen/Schreiben von `.kanprompt-version.json` (Datei wird ignoriert, nicht aktiv gelöscht)
- `updateProjectVersionFile()` Funktion

## [1.4.0] - 2026-03-22

### Changed
- **Karten-ID auf Nummer umgestellt**: Die Kartennummer (`num`) ist jetzt der primäre Identifikator statt des Slug-basierten `id`-Feldes
- Registry: `id`-Feld ist jetzt eine formatierte Nummer (`"0072"` statt `"companion-pflicht-schema-migration-entfernen"`)
- Registry: `cardPriority` enthält jetzt Nummern statt Slugs
- Registry: `blockedBy` enthält jetzt Nummern statt Slugs
- Dateinamen folgen dem Format `NNNN-slug.md` (z.B. `0072-companion-pflicht.md`)
- API-Endpunkte akzeptieren die Kartennummer als `:cardId` (z.B. `GET /api/projects/KanPrompt/cards/72`)
- UI zeigt Kartennummern konsistent als `#NNNN` (4-stellig, zero-padded)
- Branch-Namen bei CC-Start nutzen das Format `type/NNNN-slug`
- KanPrompt auf v0.23.0, Companion auf v1.4.0

### Added
- `scripts/migrate-card-ids.js` — Einmaliges Migrationsskript zum Umbenennen bestehender Karten (Dateien + Registry)
- `padNum()`-Hilfsfunktion in Companion und Frontend
- `findCardByNum()`-Lookup im Companion für nummerbasierte Kartensuche

## [1.3.1] - 2026-03-21

### Fixed
- **Worktree-Delete bei inkonsistentem Zustand**: `/worktree-delete` und `/worktree-remove` führen bei fehlgeschlagenem `git worktree remove` jetzt einen Fallback-Cleanup durch (`git worktree prune` + Verzeichnis löschen)
- Sicherheitscheck: `fs.rmSync` wird nur auf Pfade mit `-worktrees/` angewendet, nie auf das Hauptrepo

## [1.3.0] - 2026-03-21

### Added
- **UI-Migration auf Registry**: KanPrompt UI nutzt jetzt die Projects Registry API als primäre Datenquelle statt `backlog-priority.json` + Ordnerstruktur
- `POST /api/projects/:id/migrate-backlog` — Importiert bestehende `backlog-priority.json`-Daten in die Registry und verschiebt Dateien in flaches `doc/prompts/`-Verzeichnis
- Registry-Modus im UI: Spalten basieren auf `card.status` statt auf physischen Ordnern
- Drag & Drop zwischen Spalten nutzt `PATCH /api/projects/:id/cards/:cardId/status` — keine Datei-Verschiebungen mehr
- Karten-Erstellung registriert via `PUT /api/projects/:id/cards/:cardId`
- Karten-Reihenfolge wird via `PUT /api/projects/:id/card-priority` persistiert
- `blocked`/`blockedBy`-Felder im Card-Datenmodell der Registry
- Automatische Migration beim ersten Laden: bestehende Backlog-Daten werden idempotent importiert
- Legacy-Fallback: Ohne Companion arbeitet KanPrompt weiterhin mit `backlog-priority.json`

### Changed
- KanPrompt auf v0.22.0
- Companion-Server auf v1.3.0
- `registerProjectWithCompanion()` ist jetzt async (Promise-basiert)
- Deleted-Karten werden im Registry-Modus aus der API geladen statt aus dem `deleted/`-Ordner
- Column-Header zeigen im Registry-Modus keine Ordner-Hinweise mehr

## [1.2.0] - 2026-03-21

### Added
- **Worktree-Lebenszyklus im Dispatch**: Erstellen, Merge und Löschen als First-Class-Aktionen
- `POST /worktree-merge` — Merge mit ff-only/squash-Strategie, automatischer Default-Branch-Erkennung und Cleanup
- `POST /worktree-delete` — Löschen mit Dirty-Check, Branch-Cleanup und Force-Option
- `POST /worktree-diff-stat` — Pre-Merge-Info: Commit-Anzahl, Diff-Statistik, Merge-Status
- 🌿-Badge in der Auftrags-Zeile zeigt aktiven Worktree-Branch
- [Merge]-Button öffnet Dialog mit Diff-Statistik (Dateien, Insertions, Deletions, Commits)
- [Delete]-Button öffnet Dialog mit Dirty-Warning und Branch-Beibehaltungs-Option
- Merge-Strategie-Auswahl: Fast-Forward (Default) oder Squash
- Verwaiste Worktrees werden in der Git-Status-Sektion mit ⚠️ markiert + [Delete]-Aktion
- `execPromise` und `getDefaultBranch` Helper-Funktionen im Companion
- Worktree-Pfad und Branch werden im Dispatch-Item gespeichert

### Changed
- Companion-Server auf v1.2.0
- `/worktree-remove` bleibt als Legacy-Endpoint erhalten

## [1.0.0] - 2026-03-20

### Added
- **Projects Registry**: Zentrale JSON-Datenbank im Companion als Single Source of Truth für Projekt- und Kartendaten
- Neue Datei `companion/projects-registry.json` — die Registry-Datenbank
- REST-API für Projekte: `GET/PUT/DELETE /api/projects/:id`
- REST-API für Karten: `GET/PUT/DELETE /api/projects/:id/cards/:cardId`
- Status-Transitions via `PATCH /api/projects/:id/cards/:cardId/status` mit automatischen Timestamps
- Rückwärtsbewegungen (z.B. done → in-progress) löschen nachfolgende Timestamps
- Denormalisierter Status wird in die Markdown-Datei geschrieben
- Kartensortierung via `PUT /api/projects/:id/card-priority`
- Worktree-Verwaltung via `GET/PUT/DELETE /api/projects/:id/worktrees/:branch`
- Snapshot-Mechanismus: `POST /api/projects/:id/snapshot` erzeugt `.registry-snapshot.json` im Projekt
- Recovery: Bei fehlendem `projects-registry.json` wird aus Snapshots wiederhergestellt
- Atomares Speichern (temp-file + rename) für Datenbank-Integrität

### Changed
- Companion-Server auf v1.0.0
- CORS erlaubt jetzt PUT, PATCH, DELETE Methoden

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
