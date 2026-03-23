# CC-Launch überarbeiten: Live-Runner statt Clipboard-Hack

## Problem / Motivation

Der aktuelle `launchCC()` im Companion Server startet CC interaktiv und kopiert den Prompt in die Zwischenablage (`echo ... | clip`). Der User muss dann Ctrl+V drücken. Probleme:

1. **Kein automatischer Prompt-Start** — CC wartet auf manuelle Eingabe
2. **Kein Live-Feedback** — `claude -p` mit `--output-format json` friert das Terminal ein, bis CC fertig ist. Man sieht nicht ob CC arbeitet oder hängt.
3. **Kein nahtloser Übergang** — Nach der automatischen Phase kann man nicht interaktiv weiterarbeiten

## Getestete Lösung (cc-launch-testbed)

In `C:\git\local\cc-launch-testbed\launch-tests\` wurde ein funktionierender Prototyp entwickelt und erfolgreich getestet:

- **`cc-live-runner.js`** — Node.js-Wrapper, der CC in zwei Phasen startet:
  - Phase 1: `claude -p {prompt} --allowedTools "Read,Write,Edit" --output-format stream-json --verbose` via `exec()` — Live NDJSON-Events werden geparst und formatiert angezeigt (Tool-Aufrufe in gelb, Text in weiß, Zusammenfassung in grün)
  - Phase 2: Nach Abschluss öffnet sich automatisch ein neues Terminal mit `claude --resume {sessionId}` für interaktive Weiterarbeit
- **Config per JSON-Datei** statt Kommandozeilen-Argumenten — umgeht das Windows-Quoting-Problem komplett
- **Start via `wt.exe`** (Windows Terminal) mit absolutem Pfad `$env:LOCALAPPDATA\Microsoft\WindowsApps\wt.exe`

Erkenntnisse aus den Tests:
- `stream-json` erfordert `--verbose` Flag (sonst Fehler)
- `exec()` statt `spawn()` für PATH-Auflösung (Node.js v24 hat Probleme mit `shell: true` + `spawn`)
- `claude` liegt unter `C:\Users\{user}\.local\bin\claude.exe`, `where claude` findet ihn über PATH
- `--continue` funktioniert nicht in exec() (kein TTY), daher neues Terminal mit `--resume`
- Die interaktive Phase 2 ist optional (`config.interactive`)

## Betroffene Dateien

- `companion/kanprompt-companion.js` — `launchCC()` komplett ersetzen
- `companion/cc-live-runner.js` — Neues Modul (aus Testbed übernehmen und anpassen)
- `kanprompt.html` — Ggf. UI-Anpassung: Modus-Auswahl (silent / live+interaktiv)

## Ist-Zustand

```javascript
// launchCC() in kanprompt-companion.js (v0.6.0)
// 1. Schreibt Batch-File mit `echo {prompt} | clip` und `claude`
// 2. Startet via `exec('start "" cmd /k "tmpBat"')`
// → Terminal öffnet sich, Prompt in Zwischenablage, User muss Ctrl+V drücken
```

## Soll-Zustand

### Neuer Companion-Endpoint: `/start-cc` (ersetzt `/start-cc-worktree`)

Empfängt: `{ projectPath, promptFile, promptText, allowedTools, worktree, interactive }`

Ablauf:
1. Optional Worktree erstellen (wie bisher)
2. Config-JSON in Temp-Verzeichnis schreiben:
   ```json
   {
     "prompt": "Lies die Datei doc/prompts/new/xyz.md und setze die Aufgabe um.",
     "cwd": "C:\\path\\to\\project",
     "allowedTools": "Read,Write,Edit,Bash(node *),Bash(git *)",
     "interactive": true
   }
   ```
3. `cc-live-runner.js` in Windows Terminal starten:
   ```
   wt.exe -d {cwd} --title "CC: {projekt} | {branch}" cmd /k "node {path-to-runner} {config.json}"
   ```
4. Response an KanPrompt: `{ action: 'cc-started', sessionId: null, configPath: '...' }`

### `cc-live-runner.js` — Kernlogik

- Liest Config aus JSON-Datei (Pfad als einziges CLI-Argument)
- Phase 1: `exec()` mit `claude -p ... --output-format stream-json --verbose`
  - Parst NDJSON-Zeilen live
  - Zeigt Tool-Aufrufe (Read, Write, Edit, Bash) mit Datei/Command-Info
  - Zeigt CC-Textausgabe
  - Merkt sich `session_id` aus dem `result`-Event
  - Zeigt Dauer und Kosten am Ende
- Phase 2 (wenn `interactive: true`): Öffnet neues Terminal mit `wt.exe ... claude --resume {sessionId}`
- Phase 2 (wenn `interactive: false`): Gibt session_id aus und beendet sich

### Modi für KanPrompt-Button

- **"⚡ CC"** (Default): `interactive: true` — Live-Runner + interaktiver Resume
- **"⚡ CC silent"** (Shift+Klick oder Checkbox): `interactive: false` — Nur Live-Runner, kein Resume-Terminal

## Constraints

- `cc-live-runner.js` muss auch standalone funktionieren (Testbed-kompatibel)
- Bestehende Worktree-Logik bleibt erhalten
- Config-JSON-Dateien im Temp-Verzeichnis aufräumen (oder in `{project}/.kanprompt/` speichern)
- `wt.exe` Pfad: `path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WindowsApps', 'wt.exe')` — Fallback auf `start cmd /k` falls nicht vorhanden
- Encoding: Batch-Files mit `chcp 65001` oder komplett vermeiden (Node.js direkt)

## Verifikation

1. [ ] KanPrompt Preview → "⚡ CC" klicken
2. [ ] Terminal öffnet sich sofort mit "=== CC Live Runner ===" Header
3. [ ] Live-Output sichtbar: `>> Read: ...`, `>> Edit: ...`, `>> Bash: ...`
4. [ ] Nach Abschluss: "=== Prompt abgearbeitet ===" mit Dauer/Kosten
5. [ ] Zweites Terminal öffnet sich mit interaktiver CC-Session
6. [ ] Interaktive Session hat vollen Kontext der vorherigen Arbeit
7. [ ] Shift+Klick: Nur Live-Runner, kein zweites Terminal
8. [ ] Worktree-Checkbox funktioniert weiterhin

---

# Session-Log

- **Datum:** 2026-03-19T23:15:00
- **Branch:** master
- **Ergebnis:** Erfolgreich

## Zusammenfassung
Clipboard-Hack durch Live-Runner ersetzt: `cc-live-runner.js` parst NDJSON-Stream live im Terminal, zeigt Tool-Aufrufe und Text an, und startet optional ein Resume-Terminal. Companion-Server nutzt Config-per-JSON statt Batch-Files.

## Geanderte Dateien
- `companion/cc-live-runner.js` — Neues Modul: Live-Stream-Parser + Resume-Logik (aus Testbed adaptiert)
- `companion/kanprompt-companion.js` — `launchCC()` durch `launchCCLiveRunner()` ersetzt, Endpoint `/start-cc` + Alias, Version 0.7.0
- `kanprompt.html` — `startCCWithPrompt(event)` mit Shift-Erkennung, Endpoint auf `/start-cc`, Version 0.16.0
- `CHANGELOG.md` — Eintrag fuer 0.16.0

## Abweichungen vom Prompt
Keine.

## Offene Punkte
- Manuelle Verifikation der 8 Testpunkte steht noch aus (erfordert laufenden Companion-Server + KanPrompt im Browser)
