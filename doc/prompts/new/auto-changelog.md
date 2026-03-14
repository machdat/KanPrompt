# CHANGELOG automatisch aus Git-Commits pflegen

## Problem / Motivation

Das CHANGELOG.md wird manuell gepflegt und ist jetzt schon leicht veraltet. Bei der Geschwindigkeit, mit der KanPrompt-Versionen entstehen (heute allein v0.6.6 bis v0.7.2), ist manuelles Pflegen nicht nachhaltig.

## Betroffene Dateien

- `CHANGELOG.md` — Ziel: wird automatisch generiert oder ergänzt
- Evtl. `scripts/generate-changelog.ps1` — Neues Script

## Ist-Zustand

CHANGELOG.md wird von Hand geschrieben und hinkt dem Git-Log hinterher.

## Soll-Zustand

- Commit-Messages folgen Conventional Commits (`feat:`, `fix:`, `cleanup:`, `chore:`)
- Ein Script generiert aus den Git-Tags und Commit-Messages ein formatiertes CHANGELOG
- Alternativ: Script ergänzt nur neue Einträge seit dem letzten Tag

## Constraints

- Kein Node.js-Tool nötig — PowerShell oder Python reicht
- Bestehende CHANGELOG-Einträge nicht überschreiben
- Ergebnis muss menschenlesbar bleiben (kein reiner Git-Log-Dump)

## Verifikation

1. Script ausführen → CHANGELOG enthält alle Versionen mit gruppierten Änderungen
2. Erneut ausführen → keine Duplikate
