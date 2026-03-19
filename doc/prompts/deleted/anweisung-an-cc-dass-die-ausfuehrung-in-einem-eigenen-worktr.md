# CC-Ausführung in eigenem Worktree

## Problem / Motivation

Aktuell arbeitet CC direkt im Hauptverzeichnis des Repos (main working tree). Das bedeutet:
- Nur ein Prompt kann gleichzeitig bearbeitet werden
- Parallele CC-Sessions würden sich gegenseitig in die Quere kommen (uncommitted changes, Konflikte)
- Ein fehlgeschlagener Prompt hinterlässt Änderungen direkt auf master

Die Lösung: Jeder Prompt wird in einem eigenen Git-Worktree ausgeführt. CC bereitet den Worktree vor und bittet den User, eine neue CC-Session dort zu starten. So können mehrere Prompts parallel laufen, und master bleibt sauber bis zum Merge.

## Betroffene Dateien

- `CLAUDE.md` — Neuer Abschnitt "Worktree-Regeln" im bestehenden "CC-Prompt Workflow" Block
- `workflow/CLAUDE-backlog-section.md` — Worktree-Schritte in die Workflow-Vorlage integrieren

## Ist-Zustand

Der "CC-Prompt Workflow"-Abschnitt in `CLAUDE.md` und `workflow/CLAUDE-backlog-section.md` beschreibt den Ablauf so:
1. JSON lesen → Task zeigen → Bestätigung abwarten
2. Prompt-Datei nach `in-progress/` verschieben, JSON aktualisieren
3. Implementierung direkt im Hauptverzeichnis
4. Session-Log → Prompt nach `done/`, JSON aktualisieren

Kein Worktree, keine Branch-Isolation — alles passiert direkt auf master im main working tree.

## Soll-Zustand

Der Workflow wird in drei Phasen aufgeteilt. CC arbeitet **nicht** selbst im Worktree weiter, sondern übergibt an den User.

### Phase 1 — Vorbereitung (CC im Hauptverzeichnis)

CC wird gebeten, das nächste Item abzuarbeiten:

1. `doc/prompts/backlog-priority.json` lesen
2. Ersten nicht-blockierten Eintrag in `backlog` finden
3. **Task dem User zeigen und auf Bestätigung warten** — nicht eigenständig loslegen
4. Nach Bestätigung — Worktree erstellen:
   ```bash
   git worktree add C:\git\WORKTREES\<prompt-id> -b prompt/<prompt-id> master
   ```
5. **User bitten, CC im Worktree-Verzeichnis zu starten:**
   > Worktree erstellt: `C:\git\WORKTREES\<prompt-id>`
   > Branch: `prompt/<prompt-id>`
   >
   > Bitte starte Claude Code in diesem Verzeichnis und setze dort die Implementierung fort.
   > Der Prompt `<prompt-id>` liegt in `doc/prompts/new/<dateiname>`.

CC macht in Phase 1 **keine** Prompt-Lifecycle-Änderungen (kein Verschieben, kein JSON-Update). Das passiert erst in Phase 2.

### Phase 2 — Implementierung (neue CC-Session im Worktree)

Der User startet CC im Worktree-Verzeichnis `C:\git\WORKTREES\<prompt-id>`. CC dort:

1. Prompt-Datei von `new/` nach `in-progress/` verschieben
2. JSON aktualisieren: Eintrag von `backlog` nach `inProgress`, `"inProgress"` Timestamp setzen
3. Committen: `chore: start prompt <prompt-id>`
4. **Implementierung** — normale Arbeit, Commits nach Bedarf
5. Session-Log an Prompt-Datei anhängen
6. Prompt-Datei von `in-progress/` nach `done/` verschieben
7. JSON aktualisieren: Eintrag von `inProgress` nach `done`, `"done"` Timestamp setzen
8. Committen: `chore: complete prompt <prompt-id>`
9. **User über Merge-Schritte informieren:**
   > Prompt `<prompt-id>` abgeschlossen.
   >
   > Nächste Schritte (im Hauptverzeichnis `<REPO_ROOT>`):
   > ```
   > git merge prompt/<prompt-id>
   > git worktree remove C:\git\WORKTREES\<prompt-id>
   > git branch -d prompt/<prompt-id>
   > ```

### Phase 3 — Merge und Aufräumen (im Hauptverzeichnis)

Der User (oder CC im Hauptverzeichnis) führt aus:
```bash
cd <REPO_ROOT>
git merge prompt/<prompt-id>
git worktree remove C:\git\WORKTREES\<prompt-id>
git branch -d prompt/<prompt-id>
```

Fast-Forward-Merge bevorzugt. Bei Konflikten: User entscheidet.

### Worktree-Basispfad

Zentral für alle Projekte: `C:\git\WORKTREES`

Worktree-Pfade sind `C:\git\WORKTREES\<prompt-id>` — flach, ohne Projekt-Unterordner. Der kurze Pfad vermeidet das Windows MAX_PATH-Problem.

### Recovery: Worktree existiert bereits

Wenn der Worktree oder Branch für einen Prompt bereits existiert (z.B. vorherige Session abgebrochen):

- **Phase 1:** Prüfen ob Branch/Worktree existiert: `git worktree list` und `git branch --list prompt/<prompt-id>`
- Wenn ja: Worktree **nicht** neu anlegen, sondern User informieren:
  > Worktree `C:\git\WORKTREES\<prompt-id>` existiert bereits (vermutlich von einer früheren Session).
  > Bitte starte Claude Code dort, um fortzusetzen.
- **Phase 2:** CC im Worktree erkennt den Zustand (Prompt in `new/` oder schon in `in-progress/`) und setzt entsprechend fort.

### Ergänzung in CLAUDE.md

Im bestehenden "CC-Prompt Workflow"-Block kommt ein neuer Unterabschnitt:

```markdown
#### Worktree-Regeln

Jeder Prompt wird in einem eigenen Git-Worktree ausgeführt. CC erstellt den Worktree und übergibt an den User — die Implementierung erfolgt in einer separaten CC-Session im Worktree.

- **Worktree-Basispfad:** `C:\git\WORKTREES`
- **Branch-Konvention:** `prompt/<prompt-id>`
- **Basis-Branch:** `master`

Phase 1 (CC im Hauptverzeichnis):
1. Task auswählen und User-Bestätigung einholen
2. Worktree erstellen: `git worktree add C:\git\WORKTREES\<prompt-id> -b prompt/<prompt-id> master`
3. User bitten, CC im Worktree-Verzeichnis zu starten — KEINE Prompt-Lifecycle-Änderungen hier

Phase 2 (CC im Worktree):
1. Prompt-Lifecycle: `new/` → `in-progress/` → implementieren → `done/`
2. Alle Commits auf Branch `prompt/<prompt-id>`
3. Nach Abschluss: User über Merge-Schritte informieren

Phase 3 (im Hauptverzeichnis):
1. `git merge prompt/<prompt-id>`
2. `git worktree remove C:\git\WORKTREES\<prompt-id>`
3. `git branch -d prompt/<prompt-id>`

Recovery: Wenn Worktree/Branch bereits existiert → nicht neu anlegen, sondern User bitten dort fortzusetzen.
```

### Ergänzung in workflow/CLAUDE-backlog-section.md

Dieselbe Struktur, aber mit Platzhaltern:

```markdown
#### Worktree-Regeln

Jeder Prompt wird in einem eigenen Git-Worktree ausgeführt. CC erstellt den Worktree und übergibt an den User — die Implementierung erfolgt in einer separaten CC-Session im Worktree.

- **Worktree-Basispfad:** `<in CLAUDE.md definieren, z.B. C:\git\WORKTREES>`
- **Branch-Konvention:** `prompt/<prompt-id>`
- **Basis-Branch:** `<Hauptbranch, z.B. master oder main>`

Phase 1 (CC im Hauptverzeichnis):
1. Task auswählen und User-Bestätigung einholen
2. Worktree erstellen: `git worktree add <BASE>/<prompt-id> -b prompt/<prompt-id> <HAUPTBRANCH>`
3. User bitten, CC im Worktree-Verzeichnis zu starten — KEINE Prompt-Lifecycle-Änderungen hier

Phase 2 (CC im Worktree):
1. Prompt-Lifecycle: `new/` → `in-progress/` → implementieren → `done/`
2. Alle Commits auf Branch `prompt/<prompt-id>`
3. Nach Abschluss: User über Merge-Schritte informieren

Phase 3 (im Hauptverzeichnis):
1. `git merge prompt/<prompt-id>`
2. `git worktree remove <BASE>/<prompt-id>`
3. `git branch -d prompt/<prompt-id>`

Recovery: Wenn Worktree/Branch bereits existiert → nicht neu anlegen, sondern User bitten dort fortzusetzen.
```

### Anpassung des bestehenden Workflow-Ablaufs

Der bisherige "When asked to work on the next task"-Abschnitt wird so angepasst, dass er den Drei-Phasen-Ablauf widerspiegelt. Die Schritte 1-3 (JSON lesen, Task finden, Bestätigung) bleiben gleich. Schritte 4-5 werden durch die Phase-1-Übergabe ersetzt. Der bisherige Schritt 4 (Prompt verschieben, JSON updaten, implementieren) und Schritt 5 (Session-Log, done) werden als "Phase 2 — im Worktree" dokumentiert.

## Constraints

- Bestehende Workflow-Schritte (JSON lesen, Task zeigen, Bestätigung, Timestamps, Session-Log) bleiben inhaltlich unverändert — sie werden nur auf die Phasen aufgeteilt
- Timestamp-Regeln bleiben exakt wie sie sind
- Session-Log-Format bleibt unverändert, **aber** das Feld `Branch` im Log enthält jetzt den Worktree-Branch: `prompt/<prompt-id>`
- `kanprompt.html` wird NICHT geändert — das ist ein reiner Workflow/Doku-Change
- Die Worktree-Funktionalität ist optional: Wenn ein Projekt keinen `WORKTREE_BASE` in CLAUDE.md definiert, arbeitet CC wie bisher direkt im Hauptverzeichnis
- `workflow/scaffold/` bleibt unverändert (enthält keine CLAUDE.md)
- CC im Hauptverzeichnis macht **keine** Prompt-Lifecycle-Änderungen (kein Verschieben, kein JSON-Update) — das passiert ausschließlich im Worktree

## Verifikation

1. `CLAUDE.md` enthält den neuen "Worktree-Regeln"-Abschnitt mit konkretem Pfad `C:\git\WORKTREES`
2. `workflow/CLAUDE-backlog-section.md` enthält den generischen Worktree-Abschnitt mit Platzhaltern
3. Der Workflow-Ablauf ist klar in drei Phasen aufgeteilt (Vorbereitung → Implementierung → Merge)
4. Phase 1 endet mit einer Aufforderung an den User, CC im Worktree zu starten
5. Phase 2 enthält den kompletten Prompt-Lifecycle (in-progress, Implementierung, done, Session-Log)
6. Bestehendes (Timestamps, Session-Log, Reihenfolge-Logik) ist unverändert
7. Dry-Run: CC erhält im Hauptverzeichnis den Befehl "Arbeite das nächste Item ab" → zeigt Task → nach Bestätigung erstellt Worktree → bittet User, dort CC zu starten (und macht NICHT selbst weiter)

## Session-Log — Pflichtaufgabe nach Abschluss

Nachdem alle Änderungen umgesetzt und verifiziert sind, ist als **letzter Schritt** folgendes zu tun:
Öffne diese Prompt-Datei und hänge am Ende ein ausgefülltes Session-Log an.
Ersetze dabei diesen gesamten Abschnitt durch das fertige Log.
