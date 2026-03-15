# CC Prompt Workflow

Wiederverwendbare Vorlage für den Kanban-gesteuerten CC-Prompt-Workflow.

## Aktive Dateien

| Datei | Zweck |
|---|---|
| `CLAUDE-backlog-section.md` | Text für CLAUDE.md — sagt CC wie es mit der JSON umgehen soll |
| `scaffold/doc/prompts/TEMPLATE.md` | Prompt-Vorlage (auch in KanPrompt eingebaut) |
| `scaffold/doc/prompts/README.md` | Konventionen für das Prompts-Verzeichnis |
| `scaffold/` | Kopiervorlage der Ordnerstruktur |

## Workflow

### Du (in KanPrompt oder Claude.ai)
- Prompts erstellen, priorisieren, Drag & Drop zwischen Spalten
- KanPrompt: `file:///C:/Users/christian.mangold/.kanprompt/kanprompt.html`

### CC (Claude Code)
- "Arbeite das nächste Item ab" → CC liest JSON, zeigt Item, wartet auf Go
- Nach Bestätigung: verschiebt nach `in-progress/`, setzt Zeitstempel
- Nach Abschluss: Session-Log anhängen, nach `done/`, Zeitstempel setzen

## Setup für ein neues Projekt

1. Öffne KanPrompt → "Projekt-Ordner öffnen" → KanPrompt erstellt `doc/prompts/` automatisch
2. Kopiere den Inhalt von `CLAUDE-backlog-section.md` in die `CLAUDE.md` des Projekts
3. `.kanprompt-version.json` liegt schon im Scaffold — prüfen ob Schema-Version aktuell ist
4. Fertig — Prompts erstellen geht direkt in KanPrompt (+ Prompt Button)

## Archiviert

Der `_archived/`-Ordner enthält das alte PowerShell-Board-System (ersetzt durch KanPrompt):
- `generate-kanban-board.ps1` — alter Board-Generator
- `kanban-board-template.jsx` — altes JSX-Template
- `setup-prompt-workflow.ps1` — altes Setup-Script
- `GUIDE.md` — alte ausführliche Anleitung
