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

---

# Session-Log

- **Datum:** 2026-03-15T19:55:00
- **Branch:** master
- **Ergebnis:** Erfolgreich

## Zusammenfassung

Archiv-Overlay-Layout überarbeitet: Zweizeiliges Layout mit Titel prominent in der ersten Zeile (13px, bold), darunter die ID und kompaktes Done-Datum. Die drei vollen Timestamps (new/inProgress/done) wurden durch eine kompakte Meta-Zeile ersetzt. Suchfeld und Klick-to-Preview waren bereits implementiert.

## Geänderte Dateien

- `kanprompt.html` — CSS: `.archive-item` auf flex-column umgestellt, `.archive-item-file`/`.archive-item-dates` durch `.archive-item-meta` ersetzt. JS: `renderArchiveList` Rendering auf zweizeiliges Layout mit ID + formatiertem Done-Datum geändert.

## Abweichungen vom Prompt

- Suchfeld und Klick-to-Preview waren bereits vorhanden — nur das Layout wurde verbessert
- Sort-Toggle (optional lt. Prompt) nicht implementiert — neueste zuerst ist der sinnvolle Default

## Offene Punkte

Keine.
