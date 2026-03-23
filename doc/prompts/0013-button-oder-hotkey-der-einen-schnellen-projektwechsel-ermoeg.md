# Button oder HotKey der einen schnellen Projektwechsel ermöglicht

## Problem / Motivation

Aktuell muss man zum Projektwechsel die Seite komplett neu laden oder manuell auf den Welcome-Screen zurücknavigieren — es gibt keinen schnellen Weg, zwischen Projekten umzuschalten. Das ist umständlich, wenn man mehrere Projekte mit KanPrompt verwaltet. Die „Zuletzt geöffnet"-Liste existiert nur auf dem Welcome-Screen und ist im App-Modus nicht erreichbar.

## Betroffene Dateien

- `kanprompt.html` — Header-Bereich, State-Reset-Logik, Event-Listener für Hotkey

## Ist-Zustand

- Projektwechsel nur über Browser-Reload (`F5`) → Welcome-Screen → Projekt wählen
- Die Recent-Projects-Liste ist ausschließlich auf dem Welcome-Screen sichtbar
- Kein Keyboard-Shortcut zum Wechseln definiert
- Beim Wechsel muss der komplette App-State (polling, preview, caches) sauber zurückgesetzt werden

## Soll-Zustand

- **Im Header:** Ein Button (z.B. 📂 neben dem Projekt-Label oder als Dropdown) der entweder:
  - a) Den Welcome-Screen mit der Recent-Liste einblendet (einfachste Variante), oder
  - b) Ein Dropdown/Popup mit den letzten Projekten öffnet (komfortabler)
- **Hotkey:** `Ctrl+O` oder `Ctrl+P` öffnet den Projektordner-Dialog (`showDirectoryPicker()`)
- **State-Reset:** Beim Wechsel müssen sauber zurückgesetzt werden:
  - `projectHandle`, `dirHandle`, `subDirs`, `jsonHandle`, `jsonData`
  - `fileContentsCache` leeren
  - Preview schließen (`closePreview()`)
  - Polling stoppen und neu starten
  - Board leeren

## Constraints

- Kein zusätzlicher Overhead im Header — der Button muss sich in das bestehende Design einfügen
- Recent-Projects-Daten (localStorage + IndexedDB-Handles) bleiben unverändert
- `openProjectFolder()` und `reopenProject()` können wiederverwendet werden
- Hotkey darf nicht mit Browser-eigenen Shortcuts kollidieren (Ctrl+O ist File-Open im Browser — ggf. `Ctrl+Shift+O` oder anders)

## Verifikation

1. Im App-Modus: Button im Header klicken → Projektwechsel-Dialog erscheint
2. Anderes Projekt wählen → Board zeigt sofort das neue Projekt, altes State ist weg
3. Preview war offen → ist nach Wechsel geschlossen
4. Polling läuft für das neue Projekt
5. Hotkey funktioniert aus jeder Situation (auch mit offenem Modal)

---

# Session-Log

- **Datum:** 2026-03-15T18:00:00
- **Branch:** master
- **Ergebnis:** Erfolgreich

## Zusammenfassung

Schneller Projektwechsel implementiert: 📂-Button im Header neben dem Projekt-Label, der den kompletten App-State zurücksetzt (Handles, Caches, Preview, Polling) und den Welcome-Screen mit Recent-Projects-Liste zeigt. Zusätzlich Hotkey `Ctrl+Shift+O` für direkten Projektwechsel.

## Geänderte Dateien

- `kanprompt.html` — 📂-Button im Header-Left eingefügt, `switchProject()` Funktion mit vollständigem State-Reset, Hotkey `Ctrl+Shift+O` im Keyboard-Handler

## Abweichungen vom Prompt

- Variante a) umgesetzt (Welcome-Screen einblenden), nicht b) (Dropdown) — wie im Prompt als einfachste Variante vorgeschlagen
- Hotkey ist `Ctrl+Shift+O` statt `Ctrl+O` (Browser-Kollision vermieden, wie im Prompt angemerkt)

## Offene Punkte

Keine.
