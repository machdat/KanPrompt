# CLI-Button im Header entfernen oder ersetzen

## Problem / Motivation

Der „📋 CLI"-Button im Header kopiert ein Shell-Cheat-Sheet mit `jq`-Befehlen in die Zwischenablage — zum manuellen Steuern des Prompt-Workflows im Terminal. In der Praxis nutzt das niemand: Claude Code liest die CLAUDE.md und kennt den Workflow, und manuell tippt niemand diese `jq`-Einzeiler. Der Button ist ein Relikt aus der frühen Entwicklungsphase und verschwendet Platz im Header.

## Betroffene Dateien

- `kanprompt.html` — Button im Header-HTML, Funktion `exportCliHelp()`

## Ist-Zustand

- Button „📋 CLI" im Header ruft `exportCliHelp()` auf
- `exportCliHelp()` schreibt ein mehrzeiliges Shell-Script in die Zwischenablage (ca. 15 Zeilen mit `jq`-Befehlen)
- Tastenkürzel: keines (Button-only)

## Soll-Zustand

**Option A (Entfernen):** Button und Funktion `exportCliHelp()` komplett raus. Der Header wird aufgeräumter.

**Option B (Ersetzen):** Button durch etwas Nützliches ersetzen, z.B.:
- 📋 JSON-Pfad in die Zwischenablage kopieren (nützlich für CC oder Scripte)
- 📊 Schnellstatistik als Toast (X backlog, Y active, Z done)
- 🔗 Link zur Workflow-Doku (`workflow/CLAUDE-backlog-section.md`) im Editor öffnen

Empfehlung: **Option A** — weniger ist mehr. Die Info-Bar unten zeigt bereits die Statistik, und den JSON-Pfad braucht man selten.

## Constraints

- Kein anderer Button oder Funktionalität darf betroffen sein
- Falls Option B: kein neuer externer Library-Import

## Verifikation

1. Header enthält keinen „📋 CLI"-Button mehr (bzw. den Ersatz)
2. Funktion `exportCliHelp()` ist aus dem Code entfernt (falls Option A)
3. Keine JavaScript-Fehler in der Konsole
4. Alle anderen Header-Buttons funktionieren weiterhin

## Session-Log — Pflichtaufgabe nach Abschluss

Nachdem alle Änderungen umgesetzt und verifiziert sind, ist als **letzter Schritt** folgendes zu tun:
Öffne diese Prompt-Datei und hänge am Ende ein ausgefülltes Session-Log an.
Ersetze dabei diesen gesamten Abschnitt durch das fertige Log.
