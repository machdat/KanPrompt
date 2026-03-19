# Vereinigung von Sync- & Refresh-Button

## Problem / Motivation

es gibt zwei buttons um die Daten zu aktualisieren. Ich kann nicht sagen wann ich den einen oder den anderen verwenden muss/soll. Bitte reduuziere die beiden buttons auf einen, in dem beide Aktualisierungen durhcgeführt werden
## Betroffene Dateien

- `pfad/zur/datei.ext` — [Beschreibung der Änderung]

## Ist-Zustand

[Was ist aktuell der Fall?]

## Soll-Zustand

[Was soll nach der Umsetzung der Fall sein?]

## Constraints

- [Was darf NICHT geändert werden?]

## Verifikation

1. [Wie wird geprüft, dass die Änderung korrekt ist?]

---

# Session-Log

- **Datum:** 2026-03-19T22:42:00
- **Branch:** master
- **Ergebnis:** Erfolgreich

## Zusammenfassung
Die beiden Buttons „🔄 Sync" und „↻ Refresh" wurden zu einem einzigen Button „🔄 Aktualisieren" vereinigt. Die neue Funktion `refreshAll()` lädt zuerst die JSON-Datei neu von Disk und führt danach den Ordner-Sync durch. Die alte `forceSync()`-Funktion wurde entfernt, da ihre Logik in `refreshAll()` integriert ist.

## Geänderte Dateien
- `kanprompt.html` — Zwei Buttons durch einen ersetzt, `refreshAll()` statt `forceSync()` + `refreshFromDisk()`, Keyboard-Shortcut `r` aktualisiert, Sync-Warning-Banner auf neue Funktion umgestellt, Version-Bump 0.18.0 → 0.19.0

## Abweichungen vom Prompt
Keine.

## Offene Punkte
Keine.
