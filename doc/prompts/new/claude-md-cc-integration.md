# CLAUDE.md für CC-Integration anlegen

## Problem / Motivation

KanPrompt hat noch keine `CLAUDE.md` im Repo-Root. Wenn Claude Code im KanPrompt-Projekt arbeitet, weiß CC nicht, wie die Prompt-Workflow-JSON funktioniert, wo die Dateien liegen, und wie Timestamps gesetzt werden.

## Betroffene Dateien

- `CLAUDE.md` — Neu: CC-Anweisungen für das KanPrompt-Projekt
- `workflow/CLAUDE-backlog-section.md` — Vorlage, aus der die relevanten Teile übernommen werden

## Ist-Zustand

CC hat keinen Kontext über die KanPrompt-interne Prompt-Verwaltung.

## Soll-Zustand

- `CLAUDE.md` im Repo-Root enthält:
  - Projektbeschreibung (standalone HTML Kanban-Board)
  - Pfad zur JSON: `doc/prompts/backlog-priority.json`
  - Timestamp-Format: ISO mit Uhrzeit (`2026-03-14T16:45:00`)
  - Workflow: JSON lesen → Item abarbeiten → Timestamps setzen → nach done verschieben
  - Hinweis: `kanprompt.html` ist die Haupt-App, Änderungen dort erfordern Version-Bump in `const VERSION`
  - Deploy-Hinweis: nach Änderung `install\update.ps1` ausführen

## Constraints

- Nicht zu lang — CC soll schnell verstehen, was zu tun ist
- Timestamp-Format muss exakt dem in `kanprompt.html` (`nowStr()`) entsprechen

## Verifikation

1. CC im KanPrompt-Projekt starten → "Arbeite das nächste Item ab" → CC versteht den Workflow
2. Timestamps in der JSON haben das Format `YYYY-MM-DDTHH:MM:SS`
