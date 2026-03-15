# Keyboard-Navigation in der Recent-Projects-Liste (Welcome-Screen)

## Problem / Motivation

Der Hotkey `Ctrl+Shift+O` zeigt den Welcome-Screen mit der „Zuletzt geöffnet"-Liste. Dort kann man aber nur per Mausklick ein Projekt auswählen — Pfeiltasten und Enter funktionieren nicht. Das macht den Hotkey nur halb nützlich: Man wechselt per Tastatur zum Welcome-Screen, muss dann aber zur Maus greifen, um ein Projekt auszuwählen.

## Betroffene Dateien

- `kanprompt.html` — Welcome-Screen: `renderRecentProjects()`, Keyboard-Event-Handler

## Ist-Zustand

- Recent-Projects-Liste wird als `div.recent-item`-Elemente gerendert
- Jedes Element hat einen `click`-Listener → `reopenProject(name)`
- Keine Fokus-Verwaltung: Kein Element bekommt nach `switchProject()` automatisch den Fokus
- Pfeiltasten (↑/↓) und Enter haben keine Wirkung auf dem Welcome-Screen

## Soll-Zustand

- Nach dem Öffnen des Welcome-Screens (via Hotkey oder 📂-Button) bekommt der erste Eintrag der Recent-Liste automatisch den Fokus (visuelle Hervorhebung)
- **↑/↓-Pfeiltasten:** Navigieren durch die Liste (mit Wrap-Around am Ende/Anfang)
- **Enter:** Öffnet das fokussierte Projekt (`reopenProject()`)
- **Escape:** Falls vom Board kommend → zurück zum Board (ohne Projektwechsel)
- Fokussierter Eintrag bekommt ein visuelles Styling (z.B. gleicher Border wie `.card.active` mit `var(--accent-blue)`)
- Maus-Hover und Keyboard-Fokus sollen koexistieren: Mausbewegung setzt den Fokus auf das gehoverte Element

## Constraints

- Kein `tabindex` auf jedem Element nötig — die Navigation kann über einen einzelnen State-Index im JavaScript laufen
- Der „📂 Projekt-Ordner öffnen"-Button muss weiterhin per Maus erreichbar bleiben
- Wenn die Recent-Liste leer ist, passiert bei ↑/↓ nichts
- Die Keyboard-Listener dürfen nur auf dem Welcome-Screen aktiv sein (nicht im Board-Modus kollidieren)

## Verifikation

1. `Ctrl+Shift+O` drücken → Welcome-Screen öffnet sich, erster Recent-Eintrag ist fokussiert (blauer Rand)
2. ↓ drücken → Fokus wandert zum nächsten Eintrag
3. ↑ am ersten Eintrag → Fokus springt zum letzten (Wrap-Around)
4. Enter drücken → Fokussiertes Projekt wird geöffnet
5. Escape → Zurück zum Board (wenn von dort gekommen)
6. Maus über einen Eintrag bewegen → Fokus wechselt dorthin
7. Keine JavaScript-Fehler, keine Kollision mit Board-Hotkeys

## Session-Log — Pflichtaufgabe nach Abschluss

Nachdem alle Änderungen umgesetzt und verifiziert sind, ist als **letzter Schritt** folgendes zu tun:
Öffne diese Prompt-Datei und hänge am Ende ein ausgefülltes Session-Log an.
Ersetze dabei diesen gesamten Abschnitt durch das fertige Log.
