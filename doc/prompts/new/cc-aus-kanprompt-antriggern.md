# CC aus Kanprompt antriggern

## Problem / Motivation

 Ich verwende KanPrompt als Schalt- und Schnittstelle für die Prompts die ich an CC übergebe. Jetzt läuft das so ab
dass ich in CC sage dass das nächste Prompt umzusetzen ist. Wäre es möglich direkt aus KanPrompt CC den Befehl zum
Abarbeiten eines Prompts zu geben? Das würde meine Arbeit weiter vereinfachen - allerdings die Komplexität von
Kanprompt und der Infrastruktur erhöhen, das ist mir klar.

● Gute Frage — das ist technisch machbar, und es gibt mehrere Wege:

  Option A: Claude Code CLI direkt aufrufen

  Am einfachsten: KanPrompt ruft claude als Subprocess auf.

  # One-Shot: Prompt-Datei direkt übergeben
  claude -p "Bitte den Prompt doc/prompts/new/fix-balisegroup-direction.md sorgfältig umsetzen" --allowedTools
  "Edit,Read,Write,Bash,Grep,Glob"

  # Oder Inhalt pipen
  cat doc/prompts/new/fix-balisegroup-direction.md | claude -p "Setze diesen Prompt um:"

  Vorteile: Einfach, kein MCP nötig, sofort umsetzbar
  Nachteile: Kein interaktives Feedback, One-Shot-Modus hat keine Rückfrage-Möglichkeit

  Option B: Claude Code als MCP Server

  KanPrompt verbindet sich über MCP mit einer laufenden Claude Code Instanz.

  Vorteile: Bidirektionale Kommunikation, Claude Code behält Kontext
  Nachteile: Deutlich höhere Komplexität, MCP-Client in KanPrompt nötig

  Option C: Claude Code Custom Slash Command / Skill

  Ein Custom Skill in Claude Code, der den KanPrompt-Backlog direkt abfragt:

  # User tippt nur:
  /next-prompt

  Der Skill liest backlog-priority.json, nimmt den ersten Eintrag, und führt den Workflow aus.

  Vorteile: Minimalste Änderung an KanPrompt, Logik bleibt in CC
  Nachteile: Trigger kommt weiterhin vom User in CC

  ---
  Meine Empfehlung

  Option A für den schnellen Gewinn — KanPrompt fügt einen "Execute in CC"-Button pro Prompt hinzu, der claude -p
  aufruft. Das deckt 80% des Nutzens ab.

  Option C als Ergänzung — ein /next-prompt Skill in CC, der den Backlog selbständig liest. Das reduziert Deine Eingabe
  auf ein Minimum.

  Soll ich einen solchen Custom Skill oder ein Proof-of-Concept für eine der Optionen erstellen?
## Betroffene Dateien

- `pfad/zur/datei.ext` — [Beschreibung der Änderung]

## Ist-Zustand

[Was ist aktuell der Fall?]

## Soll-Zustand

[Was soll nach der Umsetzung der Fall sein?]

## Constraints

- [Was darf NICHT geändert werden?]

## Verifikation

1. [Wie wird geprüft, dass die Änderung korrekt ist?]

## Session-Log — Pflichtaufgabe nach Abschluss

Nachdem alle Änderungen umgesetzt und verifiziert sind, ist als **letzter Schritt** folgendes zu tun:
Öffne diese Prompt-Datei und hänge am Ende ein ausgefülltes Session-Log an.
Ersetze dabei diesen gesamten Abschnitt durch das fertige Log.
