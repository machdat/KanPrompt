# Fix: Preview-Panel unsichtbar (1px Breite)

## Problem / Motivation

Klick auf eine Karte öffnete das Preview-Panel nicht sichtbar — es war technisch "open" aber nur 1px breit. Ursache: `closePreview()` speicherte `offsetWidth` während der CSS-Transition (480→0px) in localStorage. Beim nächsten Öffnen wurde dieser Wert als Inline-Style gesetzt.

## Ergebnis

- Gespeicherte Breite wird nur akzeptiert wenn >= 200px
- `closePreview()` speichert nur wenn Panel voll geöffnet ist

# Session-Log

- **Datum:** 2026-03-14
- **Branch:** master
- **Ergebnis:** Erfolgreich

## Zusammenfassung

Race-Condition in localStorage-Persistierung der Preview-Breite behoben. Validierung bei Lesen und Schreiben eingebaut.

## Geänderte Dateien

- `kanprompt.html` — `openPreview()`: Minimum 200px, `closePreview()`: nur speichern wenn >= 200px

## Abweichungen vom Prompt

Keine.

## Offene Punkte

Keine.
