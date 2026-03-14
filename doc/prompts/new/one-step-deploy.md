# Deploy vereinfachen: Ein-Schritt-Update

## Problem / Motivation

Aktuell sind nach einem `git pull` zwei Schritte nötig:
1. `git pull`
2. `install\update.ps1`

Das ist fehleranfällig — man vergisst den zweiten Schritt und wundert sich, warum die Änderung nicht sichtbar ist.

## Betroffene Dateien

- `install\update.ps1` — Erweitern: `git pull` einbauen wenn im Repo ausgeführt
- Evtl. `install\kanprompt-update.bat` — Neues One-Click-Script

## Ist-Zustand

Zwei getrennte Schritte: `git pull` + `update.ps1`.

## Soll-Zustand

Ein einziger Befehl/Doppelklick:
- Erkennt ob im Git-Repo → `git pull` automatisch
- Kopiert Dateien nach `~/.kanprompt/`
- Zeigt Versionsnummer an
- Optional: Browser-Refresh auslösen (Companion-API?)

## Constraints

- `update.ps1` muss auch standalone (ohne Git) funktionieren bleiben
- Kein Admin-Recht nötig

## Verifikation

1. Doppelklick auf das Script → git pull + copy + Versionsanzeige
2. Ohne Netzwerk → Skip git pull, trotzdem copy
