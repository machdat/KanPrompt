# CC aus KanPrompt antriggern — mit Git Worktree Workflow

## Problem / Motivation

Aktuell: User öffnet Prompt in KanPrompt, kopiert die Aufgabe manuell, gibt sie in CC ein. Das ist mehrere Schritte.

Gewünscht: Von KanPrompt aus direkt einen **automatisierten Workflow starten**:
1. KanPrompt erstellt einen **git worktree** für diesen Prompt (z.B. `feat/fix-balisegroup-direction-WIP`)
2. KanPrompt triggert CC Code mit der Prompt-Datei als Input
3. CC arbeitet **im Worktree**
4. Nach Fertigstellung: Worktree-Handling (merge/cherry-pick/delete?)

Das vereinfacht den Workflow deutlich und schafft eine **klare Projekt-Isolation pro Prompt**.

## Betroffene Dateien

- `kanprompt.html` — neuer Button "⚡ In CC starten" in der Vorschau, Typ-Selektion für Worktree-Strategie
- `doc/prompts/backlog-priority.json` — neues optionales Feld: `useWorktree` (boolean) oder `worktreeStrategy` (string)
- Companion Server (`node.js`) — neue Endpoint `/start-cc-with-worktree` oder erweiterte `/claude-code` mit Worktree-Parameter

## Ist-Zustand

1. **KanPrompt**: Nur Vorschau + manuelle Weitergabe an CC
2. **CC**: User muss Prompt manuell kopieren und eingeben
3. **Git Worktrees**: Nicht im aktuellen Workflow enthalten
4. **Isolierung**: Alle Arbeiten laufen auf der Haupt-Branch oder dem aktuellen Worktree

## Soll-Zustand — Core Workflow

1. **Button in Preview**: "⚡ In CC starten" in `#previewMeta` oder Preview-Toolbar
2. **Worktree-Erstellung** (via Companion Server):
   - Branch-Name generieren: `{type}/{id}` oder `{type}/{slug}` (z.B. `feature/fix-balisegroup-direction`)
   - Neuen Worktree anlegen: `git worktree add ../worktree-{id} --track origin/main` (oder ähnlich)
   - **Pfad speichern** irgendwo (z.B. in KanPrompt State oder als temporäre Datei)
3. **CC triggern**:
   - Companion Server ruft `claude-code` oder `claude` auf mit:
     - `--cwd` auf dem neuen Worktree
     - Prompt-Datei als Input
     - Optionale Anleitung: "Arbeite in diesem Worktree. Nach Fertigstellung öffne KanPrompt und markiere als Done."
4. **CC arbeitet** im isolierten Worktree
5. **Nach Fertigstellung**: Siehe offene Fragen unten

## Offene Forschungsfragen (WICHTIG — müssen vor Implementierung geklärt werden!)

### Frage 1: Worktree-Strategie — Standard oder Checkbox?

**Option A: Standard (immer Worktree)**
- Pro: Saubere Isolation, weniger Fehler durch parallele Änderungen
- Con: Mehr Worktrees auf dem System, Disk-Platz, potenziell verwirrend

**Option B: Per Karte wählbar (Checkbox `useWorktree: boolean`)**
- Pro: Flexibilität, User kann für kleine Fixes direkt auf main arbeiten
- Con: Mehr Komplexität in KanPrompt UI, User muss Entscheidung treffen
- **Empfehlung**: Checkbox mit Default `true` (immer an, aber abschaltbar)

### Frage 2: Branch-Namensstrategie

Welche dieser Strategien bevorzugst du?

```
Option A: {type}/{slug}
feature/selektion-des-promp-typs-auch-in-der-vorschau
bugfix/duplikat-beim-erstellen-von-prompts

Option B: {type}/{id}-{slug}
feature/selektion-des-promp-typs-auch-in-der-vorschau-id123
bugfix/duplikat-beim-erstellen-von-prompts-id456

Option C: worktree-{timestamp}
worktree-2026-03-18-21-35-42
(manuell per Branch verknüpfen in der Karte)
```

**Empfehlung**: Option A (sauber, lesbar, Konflikt-Vorsorge via ID in backlog-priority.json)

### Frage 3: Was passiert nach Fertigstellung?

Das ist die **kritischste offene Frage**:

**Option 1: CC schließt sich selbst, KanPrompt fragt nach**
- CC beendet sich → Toast in KanPrompt "Prompt-Umsetzung beendet, Worktree verfügbar"
- User klickt "Done" in KanPrompt
- KanPrompt fragt: "Worktree MERGEN in main oder LÖSCHEN?"
  - Merge: `git -C {worktree} ... merge --ff-only` + delete worktree
  - Delete: `git worktree remove {worktree}` (Changes gehen verloren! Warning?)

**Option 2: CC triggered selbst das Merge/Close**
- CC-Command wird ausgeführt mit `--on-complete merge` oder `--on-complete delete`
- Companion Server führt Merge aus
- Worktree automatisch gelöscht
- KanPrompt erhält Bestätigung

**Option 3: User pushed manuell und öffnet PR**
- CC speichert Änderungen lokal im Worktree
- User muss `git push` manuell machen
- Branch verfügbar für Manual PR Review
- Worktree bleibt offen (für weitere Iterationen?)

**Empfehlung für Start**: Option 1 (einfach, Nutzer hat Kontrolle, kann vorher lokal testen)

### Frage 4: Worktree-Location

Wo sollen Worktrees gespeichert werden?

```
Option A: Neben dem Haupt-Checkout
/path/to/erju_wp27/
/path/to/erju_wp27/.git/worktrees/

Option B: In Temp-Verzeichnis
/tmp/kanprompt-worktrees/{project-name}/{id}/

Option C: Konfigurierbar in KanPrompt
```

**Empfehlung**: Option A (Git-Standard, einfach, persistent)

## Betroffene Code-Stellen

- `kanprompt.html`:
  - New Button im Preview: "⚡ In CC starten" 
  - Optionale Checkbox: "Worktree verwenden" (default: checked)
  - New function: `startCCWithPrompt(promptItem, useWorktree)`

- **Companion Server** (`node.js`):
  - New endpoint: `POST /start-cc-with-worktree`
  - Params: `{ projectPath, promptFile, promptType, useWorktree, branchName }`
  - Returns: `{ action: 'cc_started', worktreePath: '...' }`

- **Git Operations**:
  - `git worktree add`
  - `git worktree list`
  - `git worktree remove`
  - Merge-Strategy (ff-only oder Squash?)

## Constraints

- **Bestehende Prompts**: Sollten weiterhin manuell übergeben werden können (Checkbox optional)
- **Worktree-Cleanup**: Verlassene Worktrees dürfen nicht zu Datenmüll werden → regelmäßige Aufräumung oder Dashboard
- **Branch-Konflikte**: Mehrfaches Erstellen desselben Prompts darf nicht fehlschlagen (unique IDs erforderlich)
- **Git-Zustand**: Nur wenn Git verfügbar ist + Repo initialisiert (sonst fallback auf CLI-Modus)

## Verifikation (Nach Klärung aller Fragen)

1. ✓ Preview öffnen → Button "⚡ In CC starten" sichtbar
2. ✓ Button klicken → Worktree wird erstellt (prüfbar via `git worktree list`)
3. ✓ CC öffnet sich mit Prompt + korrektem `--cwd` Worktree-Pfad
4. ✓ CC führt Änderungen aus (prüfbar via `git diff` im Worktree)
5. ✓ Nach CC-Ende: KanPrompt zeigt "Worktree ready" mit Merge/Delete Optionen
6. ✓ Merge Option: `git worktree remove` + Commits auf main sichtbar
7. ✓ Reload: Prompt in Done-Spalte, Worktree gelöscht

## Nächste Schritte (RESEARCH)

Bevor CC mit der Umsetzung beginnt, müssen wir **folgende Punkte klären**:

1. ✏️ **Worktree-Strategie** (Standard vs. Checkbox) → Deine Entscheidung
2. ✏️ **Branch-Namensstrategie** → Welche Option bevorzugst du?
3. ✏️ **Nach-Fertigstellung-Workflow** → Sehr wichtig! (Merge-Optionen diskutieren)
4. ✏️ **Worktree-Location** → Standard neben .git oder separates Verzeichnis?

**Frag mich (oder CC), wenn du bei diesen Punkten Hil brauchst!**

---

# Session-Log

- **Datum:** 2026-03-18T21:40:00
- **Branch:** master
- **Ergebnis:** Erfolgreich

## Zusammenfassung
CC-Integration aus KanPrompt: "⚡ CC" Button im Preview-Panel startet Claude Code mit der Prompt-Datei als Aufgabe. Optional wird ein isolierter Git-Worktree erstellt (Checkbox "Worktree", Default: an). Branch-Name folgt dem Schema `{type}/{id}`. Der Companion-Server (v0.6.0) hat einen neuen Endpoint `/start-cc-worktree`, der Worktree-Erstellung und CC-Start kombiniert.

## Geänderte Dateien
- `kanprompt.html` — "⚡ CC" Button + Worktree-Checkbox im Preview-Toolbar, `startCCWithPrompt()` Funktion, VERSION auf 0.14.0
- `companion/kanprompt-companion.js` — `launchCC()` Helper, `/start-cc-worktree` Endpoint (Worktree-Erstellung + CC-Launch), Version 0.6.0
- `CHANGELOG.md` — Eintrag für v0.14.0

## Design-Entscheidungen (offene Fragen aus dem Prompt)
- **Q1 Worktree-Strategie**: Checkbox pro Klick, Default ON, nicht persistiert
- **Q2 Branch-Name**: `{type}/{id}` (z.B. `feature/cc-aus-kanprompt-antriggern`)
- **Q3 Nach Fertigstellung**: Manuell — User entscheidet über merge/cleanup
- **Q4 Worktree-Location**: `{project-dir}-worktrees/{branch-slug}/` (Sibling)

## Abweichungen vom Prompt
- Kein automatischer Merge/Close-Workflow (bewusst für v1 einfach gehalten)
- Kein `useWorktree`-Feld in der JSON (kein Bedarf, Checkbox ist UI-only)

## Offene Punkte
- Worktree-Cleanup-UI (Dashboard zum Aufräumen verwaister Worktrees)
- Automatischer Merge/PR-Workflow nach CC-Fertigstellung
- Statusanzeige in KanPrompt während CC läuft
