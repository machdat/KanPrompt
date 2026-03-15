# KanPrompt initialisierung beim ersten Öffnen des Prjs

## Problem / Motivation

KanPrompt legt ja schon doc/prompts/ mit den Unterordnern automatisch an, wenn man einen neuen Projekt-Ordner öffnet. Was fehlt, ist dass die App dabei auch gleich eine leere backlog-priority.json und die README.md

## Betroffene Dateien

- `kanprompt.html` — Funktion `initProjectFromHandle()`

## Ist-Zustand

es wird nur ein Teil der benötigten Struktur angelegt:  doc/prompts/ mit den Unterordnern 

## Soll-Zustand

es soll die gesamte erforderliche Struktur angelegt werden. Vorher muss noch geprüft werden ob nicht Konflikte mit bestehenden Ordnern/Dateien bestehen 
- eine leere backlog-priority.json und die 
- README.md müssten mindestens noch erstellt werden.

## Constraints

- Bestehende Dateien dürfen nicht überschrieben werden

## Verifikation

1. Neues Projekt ohne doc/prompts/ öffnen → Struktur wird komplett angelegt inkl. JSON und README
2. Projekt mit bestehender Struktur öffnen → nichts wird überschrieben

---

# Session-Log

- **Datum:** 2026-03-15T16:35:00
- **Branch:** main
- **Ergebnis:** Erfolgreich (bereits umgesetzt)

## Zusammenfassung

Bei der Analyse des aktuellen Codes (v0.7.3) stellte sich heraus, dass `initProjectFromHandle()` bereits die vollständige Initialisierung durchführt: `doc/`, `prompts/`, alle Unterordner (`new`, `in-progress`, `done`, `deleted`), `backlog-priority.json` mit Initialstruktur, und `README.md`. Bestehende Dateien werden nicht überschrieben (try/catch mit create nur bei Fehler). Die Anforderung wurde offenbar in einer früheren Session bereits implementiert, ohne dass der Prompt als done markiert wurde.

## Geänderte Dateien

Keine — Feature war bereits implementiert.

## Abweichungen vom Prompt

Keine Implementierung nötig. Der Prompt wurde als „bereits erledigt" erkannt und direkt nach done verschoben.

## Offene Punkte

Keine.
