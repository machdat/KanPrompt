# Archiv-Overlay: Suche und Filterung

## Problem / Motivation

Das Archiv-Overlay zeigt alle Done-Einträge als flache Liste. Bei 40+ erledigten Prompts wird das schnell unübersichtlich. Man kann nicht nach Titel oder Datum filtern.

## Betroffene Dateien

- `kanprompt.html` — Archiv-Overlay erweitern

## Ist-Zustand

Archiv-Overlay zeigt alle Done-Items untereinander, ohne Filter oder Suche.

## Soll-Zustand

- Suchfeld oben im Archiv-Overlay (live-Filter auf Titel und Dateiname)
- Optional: Sortierung umschalten (neueste zuerst / älteste zuerst)
- Klick auf Archiv-Eintrag öffnet Preview (wie auf dem Board)

## Constraints

- Kein externer Library-Import — reines Vanilla JS
- Performance bei 100+ Einträgen muss flüssig bleiben

## Verifikation

1. Archiv öffnen → Suchfeld tippen → Liste filtert live
2. Eintrag anklicken → Preview öffnet sich
