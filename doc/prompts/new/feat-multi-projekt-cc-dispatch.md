# Multi-Projekt CC-Dispatch: Prompts aus verschiedenen Projekten parallel starten

## Problem / Motivation

KanPrompt kann bereits zwischen Projekten wechseln (Projekt-Dropdown). Der CC-Button startet CC aber immer im Kontext des aktuell geöffneten Projekts. Das Ziel: Mehrere Prompts aus verschiedenen Projekten parallel starten und deren Status zentral in KanPrompt verfolgen.

## Ziel

1. **CC-Start ist projekt-aware**: Der Companion-Endpoint kennt den Projekt-Pfad und erstellt den Worktree im richtigen Projekt
2. **Parallele Ausführung**: Mehrere CC-Instanzen gleichzeitig, jede in ihrem eigenen Worktree
3. **Zentrale Steuerung**: Von KanPrompt aus Prompts in verschiedenen Projekten antriggern, ohne jedes Mal das Projekt wechseln zu müssen
4. **Taskleisten-Übersicht**: Jedes CC-Terminal zeigt `CC: {Projekt} | {Branch}` — sofort erkennbar

## Voraussetzungen

- feat-cc-status-dashboard muss zuerst umgesetzt sein (Worktree-Übersicht)
- Companion muss Projekt-Pfade für alle Recent-Projekte auflösen können

## Offene Fragen

- Soll man Prompts aus einem anderen Projekt starten ohne dorthin zu wechseln?
- Braucht es eine Queue/Limit für parallele CC-Instanzen?
- Wie geht man mit Projekten um, die keinen Companion-Pfad aufgelöst haben?

## Session-Log — Pflichtaufgabe nach Abschluss

Nachdem alle Änderungen umgesetzt und verifiziert sind, ist als **letzter Schritt** folgendes zu tun:
Öffne diese Prompt-Datei und hänge am Ende ein ausgefülltes Session-Log an.
Ersetze dabei diesen gesamten Abschnitt durch das fertige Log.
