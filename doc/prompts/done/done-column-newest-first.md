# Done-Spalte: Neueste Einträge oben

## Problem / Motivation

Die Done-Spalte zeigte die ältesten Einträge oben und die neuesten ganz unten — genau umgekehrt wie man es erwartet. Der Archiv-Button ("X weitere ältere Einträge") stand oben, obwohl er sich auf ältere Einträge bezieht.

## Ergebnis

- Neueste Done-Einträge stehen ganz oben
- Archiv-Button ("↓ X weitere ältere Einträge") steht ganz unten

# Session-Log

- **Datum:** 2026-03-14
- **Branch:** master
- **Ergebnis:** Erfolgreich

## Zusammenfassung

Done-Spalte umgedreht: `visible` Array wird reversed, Archiv-Button nach unten verschoben.

## Geänderte Dateien

- `kanprompt.html` — `renderBoard()` Done-Abschnitt

## Abweichungen vom Prompt

Keine.

## Offene Punkte

Keine.
