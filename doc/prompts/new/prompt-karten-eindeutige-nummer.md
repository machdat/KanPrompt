# Prompt-Karten: Eindeutige Nummer pro Projekt

## Problem / Motivation

Prompt-Karten werden derzeit nur über ihren Dateinamen identifiziert. Dieser ist lang und sperrig — für schnelle Referenzierung in Gesprächen, Logs oder Kommentaren ungeeignet. Eine kurze, eindeutige Nummer pro Projekt (z.B. `#1`, `#14`, `#99`) macht die Kommunikation über Prompts wesentlich einfacher.

## Betroffene Dateien

- `kanprompt.html` — Nummernvergabe, Anzeige auf Karten, Persistierung

## Ist-Zustand

- Karten haben keine Nummer
- Identifikation nur über den (langen) Dateinamen möglich

## Soll-Zustand

- Jede Prompt-Karte erhält eine innerhalb des angezeigten Projekts eindeutige Nummer (`#1`, `#2`, ...)
- Die Nummer wird gut sichtbar auf der Karte angezeigt
- Nummern sind stabil: einmal vergeben, ändert sich die Nummer nicht (auch nicht bei Statuswechsel oder Löschung anderer Karten)
- Neue Karten erhalten die nächste freie Nummer (höchste vergebene + 1, keine Lücken-Wiederverwendung)

## Offene Design-Fragen

- **Persistierung**: Wo wird die Nummer gespeichert? Optionen:
  - In der Prompt-Datei selbst (z.B. YAML-Frontmatter oder Kommentar)
  - In einer separaten Index-Datei pro Projekt (z.B. `prompt-index.json`)
  - Im Dateinamen als Präfix (z.B. `014-ui-improvements-sammlung.md`)
- **Scope**: Nummer ist eindeutig pro Projekt (nicht global über alle Projekte)

## Constraints

- Bestehende Prompts müssen nachträglich eine Nummer erhalten können
- Nummern dürfen nicht recycled werden (gelöschte Nummer bleibt vergeben)
- Keine Änderung am Prompt-Inhalt selbst erforderlich (Nummer ist Metadatum)

## Verifikation

1. Neues Projekt öffnen → erste Karte anlegen → Karte zeigt `#1`
2. Weitere Karten anlegen → fortlaufende Nummerierung `#2`, `#3`, ...
3. Karte löschen → nächste neue Karte überspringt die gelöschte Nummer
4. Karte zwischen Spalten verschieben → Nummer bleibt gleich
5. Projekt schließen und neu öffnen → Nummern sind erhalten

## Session-Log — Pflichtaufgabe nach Abschluss

Nachdem alle Änderungen umgesetzt und verifiziert sind, ist als **letzter Schritt** folgendes zu tun:
Öffne diese Prompt-Datei und hänge am Ende ein ausgefülltes Session-Log an.
Ersetze dabei diesen gesamten Abschnitt durch das fertige Log.
