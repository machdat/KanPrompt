# ISO-Timestamps mit Uhrzeit + sortierte Done-Spalte

## Problem / Motivation

Timestamps enthielten nur das Datum (`2026-03-14`). Wenn CC mehrere Prompts am selben Tag erledigt, waren alle gleichwertig und die Sortierung in der Done-Spalte war Zufall. Ein gerade abgeschlossener Prompt landete direkt im Archiv statt oben sichtbar.

## Ergebnis

- Timestamps jetzt im Format `2026-03-14T16:45:00`
- Done-Spalte sortiert nach vollem Timestamp (neueste oben)
- Karten zeigen `14.03. 16:45` (kompaktes deutsches Format)
- Rückwärtskompatibel mit alten Date-Only-Werten

# Session-Log

- **Datum:** 2026-03-14
- **Branch:** master
- **Ergebnis:** Erfolgreich

## Zusammenfassung

`todayStr()` durch `nowStr()` ersetzt (ISO mit Uhrzeit). Done-Spalte sortiert nach Timestamp statt Array-Position. Karten-Badge zeigt Datum + Uhrzeit kompakt. Nutzlose title-Tooltips entfernt (draggable unterdrückt native Tooltips).

## Geänderte Dateien

- `kanprompt.html` — `nowStr()`, `formatTS()`, `dateGroup()`, `renderBoard()`, `handleDrop()`, `createCard()`, `openPreview()`

## Abweichungen vom Prompt

Keine — war kein formaler Prompt, entstand aus der Session-Diskussion.

## Offene Punkte

Keine.
