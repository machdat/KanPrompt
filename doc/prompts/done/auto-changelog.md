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

---

# Session-Log

- **Datum:** 2026-03-15T17:35:00
- **Branch:** master
- **Ergebnis:** Erfolgreich

## Zusammenfassung

PowerShell-Script `scripts/generate-changelog.ps1` erstellt, das aus Git-Commit-Messages Versionen erkennt (via `(vX.Y.Z)` am Zeilenende oder `bump version to X.Y.Z`), Commits nach Conventional-Commit-Typ gruppiert (feat→Added, fix→Fixed, cleanup/docs→Changed, chore→übersprungen) und nur fehlende Versionen in CHANGELOG.md ergänzt. UTF-8-Encoding korrekt, idempotent, `-DryRun` Flag verfügbar.

## Geänderte Dateien

- `scripts/generate-changelog.ps1` — Neu: Changelog-Generator-Script
- `CHANGELOG.md` — Automatisch ergänzt um v0.7.0, v0.7.1, v0.7.2, v0.7.3

## Abweichungen vom Prompt

- Keine Git-Tags vorhanden, daher werden Versionen aus Commit-Messages extrahiert statt aus Tags
- Prompt hatte kein Session-Log-Template — hier nachgeholt

## Offene Punkte

Keine.
