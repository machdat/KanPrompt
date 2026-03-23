# UI Improvements — Sammlung

## Problem / Motivation

Sammelprompt für kleine UI-Verbesserungen, die einzeln keinen eigenen Prompt rechtfertigen.

## Änderungen

### 1. Schriftgröße ausgewähltes Projekt vergrößern

Die Schriftgröße für den Namen des aktuell ausgewählten Projekts (z.B. "KanPrompt") soll **150% der aktuellen Größe** betragen, damit es als Hauptüberschrift visuell hervorsticht.

### 2. _(Platzhalter für nächsten Punkt)_

## Betroffene Dateien

- `kanprompt.html` — CSS/Styling für Projektname

## Ist-Zustand

- Projektname wird in normaler Schriftgröße angezeigt

## Soll-Zustand

- Projektname wird in 150% Schriftgröße angezeigt
- _(wird mit jedem neuen Punkt ergänzt)_

## Constraints

- Bestehende Funktionalität darf nicht verändert werden
- Responsive Darstellung muss erhalten bleiben

## Verifikation

1. Projekt auswählen → Projektname prüfen: Schriftgröße ist deutlich größer als andere Textelemente
2. _(wird mit jedem neuen Punkt ergänzt)_

---

# Session-Log

- **Datum:** 2026-03-18T21:33:00
- **Branch:** master
- **Ergebnis:** Erfolgreich

## Zusammenfassung
Schriftgröße des Projektnamens im Header von 13px auf 20px (150%) vergrößert.

## Geänderte Dateien
- `kanprompt.html` — CSS `.project-switcher-current` font-size: 13px → 20px

## Abweichungen vom Prompt
Keine.

## Offene Punkte
Keine.
