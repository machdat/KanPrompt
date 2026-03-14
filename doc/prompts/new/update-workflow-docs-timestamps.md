# Workflow-Doku auf ISO-Timestamps mit Uhrzeit aktualisieren

## Problem / Motivation

Die Workflow-Dokumentation (`workflow/CLAUDE-backlog-section.md`, `workflow/scaffold/`) referenziert noch das alte Datumsformat `YYYY-MM-DD`. Seit v0.7.0 verwendet KanPrompt ISO-Timestamps mit Uhrzeit (`YYYY-MM-DDTHH:MM:SS`). CC und andere Tools, die die Doku lesen, würden das falsche Format verwenden.

## Betroffene Dateien

- `workflow/CLAUDE-backlog-section.md` — Timestamp-Beispiele aktualisieren
- `workflow/scaffold/doc/prompts/backlog-priority.json` — Schema-Kommentar aktualisieren
- `workflow/scaffold/doc/prompts/README.md` — Format-Beschreibung aktualisieren
- `workflow/README.md` — Falls Timestamps erwähnt

## Ist-Zustand

Doku zeigt `"done": "2026-03-14"` als Beispiel.

## Soll-Zustand

Doku zeigt `"done": "2026-03-14T16:45:00"` als Beispiel. Hinweis dass alte Date-Only-Werte rückwärtskompatibel sind, aber neue Einträge immer mit Uhrzeit erstellt werden.

## Constraints

- Keine funktionale Code-Änderung — nur Dokumentation

## Verifikation

1. Alle `.md`-Dateien im `workflow/`-Ordner durchsuchen nach `YYYY-MM-DD` ohne `T` → keine falschen Beispiele mehr
