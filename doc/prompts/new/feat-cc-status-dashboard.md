# CC-Status-Dashboard: Aktive CC-Instanzen und Worktree-Übersicht

## Problem / Motivation

Wenn mehrere CC-Instanzen parallel laufen (verschiedene Prompts, verschiedene Projekte), fehlt eine zentrale Übersicht in KanPrompt. Man muss in der Taskleiste nach Fenstern suchen und weiß nicht, welche Worktrees noch offen sind oder aufgeräumt werden können.

## Ziel

Ein Dashboard/Panel in KanPrompt, das zeigt:
1. **Aktive CC-Instanzen**: Welche Prompts laufen gerade in CC? (Status: läuft / beendet)
2. **Worktree-Übersicht**: Alle offenen Worktrees (`git worktree list` via Companion), mit Aktionen:
   - Worktree öffnen (Terminal/Explorer)
   - Worktree mergen (nach master, mit Bestätigung)
   - Worktree löschen (mit Warnung bei uncommitted changes)
3. **Cross-Projekt**: Worktrees aus verschiedenen Projekten anzeigen

## Betroffene Dateien

- `kanprompt.html` — Dashboard-UI (Overlay oder Panel)
- `companion/kanprompt-companion.js` — Neue Endpoints:
  - `GET /worktree-list` — `git worktree list` für ein Projekt
  - `POST /worktree-remove` — Worktree aufräumen
  - `POST /worktree-merge` — Branch mergen + Worktree entfernen

## Offene Fragen

- Soll das Dashboard ein eigenes Overlay sein (wie Archiv/Deleted) oder Teil der Info-Bar?
- Wie erkennt man ob eine CC-Instanz noch läuft? (PID-Tracking im Companion?)
- Automatisches Polling oder manueller Refresh?

## Session-Log — Pflichtaufgabe nach Abschluss

Nachdem alle Änderungen umgesetzt und verifiziert sind, ist als **letzter Schritt** folgendes zu tun:
Öffne diese Prompt-Datei und hänge am Ende ein ausgefülltes Session-Log an.
Ersetze dabei diesen gesamten Abschnitt durch das fertige Log.
