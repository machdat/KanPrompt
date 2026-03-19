# CC im interaktiven Modus starten — Terminal von Anfang an sichtbar

## Problem / Motivation

Wenn CC aus KanPrompt heraus gestartet wird (über den "⚡ CC" Button), läuft der Prozess im Hintergrund. Man sieht nicht, was CC gerade tut — ob es arbeitet, wartet oder auf einen Fehler gelaufen ist. Erst wenn man manuell das Terminal sucht, sieht man den Output.

**Gewünscht:** Beim Start von CC öffnet sich sofort ein sichtbares Terminal-Fenster, in dem man den CC-Output live mitlesen kann — von der ersten Zeile an.

## Betroffene Dateien

- `companion/kanprompt-companion.js` — Prozess-Start von CC anpassen: sichtbares Terminal-Fenster öffnen statt Hintergrundprozess

## Ist-Zustand

- CC wird via `child_process` im Companion gestartet
- Der Prozess läuft im Hintergrund, Terminal-Output ist nicht direkt sichtbar
- User muss aktiv nach dem Fenster/Prozess suchen

## Soll-Zustand

- Beim Klick auf "⚡ CC" öffnet sich ein **neues, sichtbares Terminal-Fenster** (cmd/PowerShell/Windows Terminal)
- Der CC-Prozess läuft **in diesem Fenster** — Output ist ab der ersten Zeile sichtbar
- Das Terminal bleibt offen, bis CC fertig ist (oder der User es schließt)
- Technisch z.B. via `start cmd /k "claude ..."` oder `start wt -d ... claude ...` (Windows Terminal) statt `child_process.spawn()` im detached/hidden Mode

## Constraints

- Bestehende Funktionalität (Worktree-Erstellung, Prompt-Übergabe, `--cwd`) bleibt erhalten
- Nur der Prozess-Start muss geändert werden — der Rest des Workflows bleibt gleich
- Plattform: Windows (cmd, PowerShell oder Windows Terminal)

## Verifikation

1. Preview öffnen → "⚡ CC" klicken
2. ✓ Sofort öffnet sich ein Terminal-Fenster
3. ✓ CC-Output ist ab der ersten Zeile sichtbar (Startup-Meldungen, Prompt-Verarbeitung)
4. ✓ CC arbeitet interaktiv im Fenster (User kann eingreifen falls nötig)
5. ✓ Nach Beendigung: Terminal bleibt offen (zum Nachlesen)

---

# Session-Log

- **Datum:** 2026-03-19T13:00:00
- **Branch:** master
- **Ergebnis:** Erfolgreich

## Zusammenfassung
In `launchCC()` den Prozess-Start von `start "" "tmpBat"` auf `start "" cmd /k "tmpBat"` geändert. Das `cmd /k` sorgt dafür, dass das Terminal-Fenster nach Beendigung von Claude Code offen bleibt (zum Nachlesen des Outputs).

## Geänderte Dateien
- `companion/kanprompt-companion.js` — `exec`-Aufruf in `launchCC()` um `cmd /k` ergänzt (Zeile 104)

## Abweichungen vom Prompt
Keine.

## Offene Punkte
Keine.
