# Bugfix: CC-Button nur für Backlog-Prompts aktiv

## Problem / Motivation

Wenn man die Vorschau für einen Prompt öffnet, ist der CC-Button (Claude Code starten) immer aktiv — auch wenn der angezeigte Prompt aus `done/` oder `deleted/` stammt. Das ist irreführend, weil ein bereits abgeschlossener oder gelöschter Prompt nicht nochmal an CC übergeben werden sollte.

## Betroffene Dateien

- `kanprompt.html` — Vorschau-Overlay / CC-Button-Logik

## Ist-Zustand

- Vorschau zeigt Prompts aus allen Ordnern (`new/`, `in-progress/`, `done/`, `deleted/`)
- Der CC-Button ist immer aktiv, unabhängig vom Ordner des angezeigten Prompts

## Soll-Zustand

- CC-Button ist nur aktiv (klickbar, volle Opazität), wenn der angezeigte Prompt aus `new/` stammt
- CC-Button ist deaktiviert (ausgegraut, nicht klickbar) für Prompts aus `in-progress/`, `done/` oder `deleted/`
- Optional: Tooltip bei deaktiviertem Button, z.B. „Nur für Backlog-Prompts verfügbar"

## Constraints

- Kein Refactoring der Vorschau-Logik — nur die Button-Aktivierung anpassen
- Der Status/Ordner des Prompts muss im Vorschau-Kontext bereits bekannt sein (prüfen, ob die Info schon durchgereicht wird)

## Verifikation

- [ ] Prompt aus `new/` öffnen → CC-Button aktiv
- [ ] Prompt aus `in-progress/` öffnen → CC-Button deaktiviert
- [ ] Prompt aus `done/` öffnen → CC-Button deaktiviert
- [ ] Prompt aus `deleted/` öffnen → CC-Button deaktiviert
- [ ] Tooltip bei deaktiviertem Button sichtbar

---

# Session-Log

- **Datum:** 2026-03-19T22:42:00
- **Branch:** master
- **Ergebnis:** Erfolgreich

## Zusammenfassung
CC-Button und Worktree-Toggle in der Vorschau werden jetzt nur für Backlog-Prompts (Ordner `new/`) aktiviert. Für Prompts aus `in-progress/`, `done/` und `deleted/` sind beide Elemente ausgegraut und nicht klickbar, mit passendem Tooltip.

## Geänderte Dateien
- `kanprompt.html` — Neue Funktion `updateCCButtonState()` hinzugefügt, die `disabled`, `opacity`, `pointerEvents` und `title` des CC-Buttons und Worktree-Toggles basierend auf `selectedCol?.folder` setzt. Aufrufe in `updateCompanionUI()`, `openPreview()` und `previewDeleted()`. Version-Bump auf 0.15.1.
- `doc/prompts/backlog-priority.json` — Eintrag von backlog nach inProgress verschoben

## Abweichungen vom Prompt
Keine.

## Offene Punkte
Keine.