# Dispatch: Git Worktree Handling (Create / Merge / Delete)

## Problem / Motivation

Worktree-Erstellung existiert bereits (`/start-cc-worktree`, #40), aber danach ist der User auf sich gestellt: Merge zurück ins Hauptrepo und Aufräumen des Worktrees müssen manuell per Git-CLI passieren. Das ist fehleranfällig und unterbricht den Workflow.

Ziel: Der Dispatch Manager übernimmt den **kompletten Worktree-Lebenszyklus** — Erstellen, Merge, Löschen — als First-Class-Aktionen in der Auftrags-Zeile.

## Betroffene Dateien

- `dispatch.html` (bzw. `kanprompt.html` falls #61 noch nicht umgesetzt) — Worktree-Aktions-Buttons in der Auftrags-Zeile, Merge-Dialog
- `companion/kanprompt-companion.js` — Neue Endpoints für Merge und Delete, Erweiterung der bestehenden Worktree-Logik

## Ist-Zustand

- **Create**: `/start-cc-worktree` erstellt Worktree + startet CC darin. Worktree-Pfad: `{project-dir}-worktrees/{branch-slug}/`. Branch-Name: `{type}/{id}`.
- **Merge**: Nicht implementiert. User muss manuell `git merge` im Hauptrepo ausführen.
- **Delete**: Nicht implementiert. User muss manuell `git worktree remove` + `git branch -d` ausführen.
- **Sichtbarkeit**: `/worktree-list` Endpoint existiert, Git-Status-Sektion im Dispatch zeigt Worktrees eingerückt.

## Soll-Zustand

### 1. Create Worktree (Erweiterung des Bestehenden)

Der bestehende Create-Flow bleibt, wird aber um Tracking erweitert:

- Nach Worktree-Erstellung speichert der Companion den Worktree-Pfad und Branch-Namen in der Instanz-Registry
- Dispatch-Zeile zeigt den Worktree-Branch neben dem Prompt-Titel (z.B. `🌿 feature/51`)
- Status `done` → Dispatch-Zeile bietet [Merge] und [Delete] Buttons an (zusätzlich zu [Resume] und [✕])

### 2. Merge zurück ins Hauptrepo

Neuer Endpoint: `POST /worktree-merge`

```json
Request:  { "projectPath": "C:\\git\\local\\KanPrompt", "worktreePath": "C:\\git\\local\\KanPrompt-worktrees\\feature-51", "strategy": "ff-only" }
Response: { "success": true, "mergedCommits": 3, "branch": "feature/51", "strategy": "ff-only" }
```

**Ablauf im Companion:**
1. `git -C {projectPath} checkout main` (oder aktuellen Default-Branch ermitteln via `git symbolic-ref HEAD`)
2. `git -C {projectPath} merge --ff-only {branch}` — Fast-Forward bevorzugt
3. Bei FF-Fehler (divergierte Branches): Abbruch mit Fehlermeldung, User muss manuell entscheiden
4. Nach erfolgreichem Merge: Worktree automatisch löschen (siehe Schritt 3)

**UI im Dispatch:**
- [Merge] öffnet einen Bestätigungs-Dialog:
  - Zeigt: Branch-Name, Anzahl Commits, Diff-Statistik (files changed, insertions, deletions)
  - Diff-Statistik via `git diff --stat main...{branch}` vorab abrufen
  - Strategie-Auswahl: Fast-Forward (Default) | Squash
  - [Merge & Aufräumen] führt Merge + Worktree-Delete in einem Schritt aus
  - [Abbrechen] schließt den Dialog

### 3. Worktree löschen

Neuer Endpoint: `POST /worktree-delete`

```json
Request:  { "projectPath": "C:\\git\\local\\KanPrompt", "worktreePath": "C:\\git\\local\\KanPrompt-worktrees\\feature-51", "deleteBranch": true }
Response: { "success": true, "removedWorktree": true, "deletedBranch": "feature/51" }
```

**Ablauf im Companion:**
1. Prüfen ob Worktree uncommitted Changes hat: `git -C {worktreePath} status --porcelain`
2. Falls dirty: Abbruch mit Warning an die UI → User muss entscheiden
3. `git worktree remove {worktreePath}` — Worktree-Verzeichnis wird gelöscht
4. Optional (wenn `deleteBranch: true`): `git branch -d {branch}` — Branch löschen (nur wenn vollständig gemergt)
5. Falls Branch nicht gemergt und `deleteBranch: true`: `git branch -D {branch}` erst nach expliziter User-Bestätigung

**UI im Dispatch:**
- [Delete] öffnet Bestätigungs-Dialog:
  - Falls clean: "Worktree `feature/51` löschen? Branch wird ebenfalls gelöscht."
  - Falls dirty: "⚠️ Worktree hat uncommitted Changes! Trotzdem löschen? Änderungen gehen verloren."
  - Falls Branch nicht gemergt: "⚠️ Branch `feature/51` wurde NICHT in main gemergt. Trotzdem löschen?"
  - Checkbox: "Branch beibehalten" (Default: aus, d.h. Branch wird mit gelöscht)

### 4. Worktree-Status in der Auftrags-Zeile

Die Dispatch-Zeile wird um Worktree-Informationen erweitert:

```
(2) erju_wp27  #14 Fix BaliseGroup  🟢 done  🌿 feature/14  38s  $0.11  [Merge] [Delete] [Resume] [✕]
```

- `🌿` zeigt an, dass ein Worktree existiert
- Nach Merge verschwindet das `🌿`-Icon
- Wenn kein Worktree verwendet wurde (Checkbox war aus): keine Worktree-Buttons

### 5. Verwaiste Worktrees erkennen

Beim Laden der Git-Status-Sektion prüft der Companion:
- `git worktree list` → alle Worktrees des Projekts
- Abgleich mit Dispatch-Queue: Worktrees ohne zugehörigen Auftrag sind „verwaist"
- Verwaiste Worktrees werden in der Git-Status-Sektion mit ⚠️ markiert
- Klick auf verwaisten Worktree bietet [Delete] an

## Umsetzungsreihenfolge

1. **`POST /worktree-merge`** — Merge-Endpoint im Companion (ff-only + Squash)
2. **`POST /worktree-delete`** — Delete-Endpoint mit Dirty-Check und Branch-Cleanup
3. **Merge-Dialog in Dispatch** — Diff-Statistik, Strategie-Wahl, Bestätigung
4. **Delete-Dialog in Dispatch** — Dirty-Warning, Branch-Beibehaltung-Option
5. **Worktree-Tracking in Instanz-Registry** — Pfad + Branch in Registry speichern
6. **Auftrags-Zeile erweitern** — 🌿-Icon, [Merge]/[Delete] Buttons kontextabhängig
7. **Verwaiste Worktrees** — Erkennung + Cleanup in Git-Status-Sektion

## Constraints

- **Kein Force-Push**: Merge-Endpoint darf niemals `--force` verwenden
- **Kein Rebase**: Nur Merge (ff-only oder Squash), kein Rebase — zu riskant für automatisierte Operationen
- **Dirty-Worktree-Schutz**: Löschen eines dirty Worktrees erfordert IMMER explizite User-Bestätigung
- **Default-Branch**: Nicht hardcoded `main` — via `git symbolic-ref refs/remotes/origin/HEAD` oder Konfiguration ermitteln
- **Bestehender `/start-cc-worktree`** bleibt abwärtskompatibel — die neuen Endpoints ergänzen, ersetzen nicht
- CHANGELOG.md-Eintrag erforderlich

## Verifikation

1. [ ] CC im Worktree fertig → Dispatch-Zeile zeigt [Merge] und [Delete]
2. [ ] [Merge] → Dialog zeigt Diff-Statistik (Dateien, Insertions, Deletions)
3. [ ] Merge bestätigen → Commits auf main sichtbar, Worktree + Branch gelöscht
4. [ ] [Delete] bei clean Worktree → Worktree + Branch werden entfernt
5. [ ] [Delete] bei dirty Worktree → ⚠️-Warning, nur nach Bestätigung
6. [ ] Merge bei divergierten Branches → Fehlermeldung, kein Silent-Fail
7. [ ] Verwaister Worktree in Git-Status → ⚠️-Markierung + [Delete]-Aktion
8. [ ] Auftrag ohne Worktree (Checkbox war aus) → keine [Merge]/[Delete] Buttons
9. [ ] `git worktree list` nach Cleanup → Worktree nicht mehr aufgelistet

---

# Session-Log — Pflichtaufgabe nach Abschluss
