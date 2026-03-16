# Refresh, Sync, Polling sieht keine neuen Dateien

## Problem / Motivation

Wenn eine neue Prompt-Datei von außen (z.B. durch Claude Code oder manuell) im `new/`-Ordner erstellt wird, bemerkt das Polling dies nicht automatisch. Man muss den „🔄 Sync"-Button manuell klicken, damit die neue Datei erkannt und in die JSON aufgenommen wird. Das ist kontraintuitiv — der User erwartet, dass neue Dateien automatisch erscheinen, genau wie JSON-Änderungen.

## Betroffene Dateien

- `kanprompt.html` — Polling-Logik (`startPoll`), ggf. `syncFolderToJson`

## Ist-Zustand

- **Polling** (alle 2 Sekunden) prüft nur, ob sich der Text von `backlog-priority.json` geändert hat. Ändert sich die JSON, wird das Board neu gerendert.
- **Sync** (`syncFolderToJson()`) scannt die Ordner `new/`, `in-progress/`, `done/` auf Dateien, die nicht in der JSON stehen (oder umgekehrt), und gleicht ab. Wird nur bei Klick auf den Sync-Button ausgelöst.
- **Refresh** (`refreshFromDisk()`) liest die JSON neu ein — scannt aber ebenfalls keine Ordner.
- Ergebnis: Wird eine `.md`-Datei von außen in `new/` gelegt (ohne JSON-Update), erscheint sie erst nach manuellem Sync auf dem Board.

## Soll-Zustand

- Das Polling soll zusätzlich zur JSON-Prüfung in einem konfigurierbaren Intervall (z.B. alle 10 Sekunden oder jedes 5. Poll-Intervall) auch die Ordner scannen — quasi ein leichtgewichtiger Auto-Sync.
- Alternativ: Der Refresh-Button soll nicht nur die JSON neu laden, sondern auch einen Folder-Scan machen (wie Sync, aber ohne extra Button).
- Neue Dateien sollen mit einem kurzen Toast angezeigt werden (z.B. „+2 neue Dateien erkannt").
- Performance: Der Folder-Scan darf nicht bei jedem 2-Sekunden-Poll laufen — `listMdFiles()` für 3 Ordner bei jedem Tick wäre zu viel. Ein sinnvolles Intervall (z.B. 10s) oder ein Change-Detection-Ansatz (Datei-Anzahl pro Ordner merken) reicht.

## Constraints

- Das bestehende JSON-Polling (2s) darf nicht langsamer werden
- `syncFolderToJson()` kann für den Ordner-Scan wiederverwendet werden
- Kein File-System-Watcher möglich (File System Access API hat keinen)
- Performance bei Projekten mit 50+ Prompt-Dateien muss akzeptabel bleiben

## Verifikation

1. Projekt in KanPrompt offen → von außen eine neue `.md`-Datei in `new/` legen (ohne JSON zu ändern)
2. Innerhalb von ~10 Sekunden erscheint die neue Karte auf dem Board + Toast
3. JSON wurde automatisch um den neuen Eintrag ergänzt
4. Umgekehrt: Datei von außen löschen → verschwindet nach nächstem Scan vom Board
5. Board bleibt flüssig, kein spürbarer Performance-Einbruch

## Session-Log — Pflichtaufgabe nach Abschluss

Nachdem alle Änderungen umgesetzt und verifiziert sind, ist als **letzter Schritt** folgendes zu tun:
Öffne diese Prompt-Datei und hänge am Ende ein ausgefülltes Session-Log an.
Ersetze dabei diesen gesamten Abschnitt durch das fertige Log.
