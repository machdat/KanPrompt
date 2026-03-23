# Bugfix: Worktree-Delete scheitert bei inkonsistentem Zustand

## Problem / Motivation

Wenn ein Worktree in einem inkonsistenten Zustand ist (z.B. Verzeichnis existiert noch, aber Git-Tracking fehlt — oder umgekehrt), schlägt `git worktree remove` mit `fatal: '...' is not a working tree` fehl. Das betrifft sowohl den `/worktree-delete`-Endpoint als auch den Legacy-`/worktree-remove`-Endpoint. Der Nutzer bleibt auf einem verwaisten Verzeichnis und/oder einer stale Git-Worktree-Referenz sitzen, die er manuell aufräumen muss.

## Betroffene Dateien

- `companion/kanprompt-companion.js` — `/worktree-delete`-Handler (Zeile ~1048ff) und `/worktree-remove`-Handler (Zeile ~1036ff)

## Ist-Zustand

1. **`/worktree-delete`**: Ruft `git -C "${removeRepo}" worktree remove "${wtResolved}"` auf. Bei Fehler → 500 mit Fehlermeldung, kein weiterer Cleanup.
2. **`/worktree-remove` (Legacy)**: Ruft `git worktree remove "${path}"` auf. Bei Fehler → 500, kein Cleanup.
3. **Ergebnis**: Verwaiste Verzeichnisse und/oder stale Git-Referenzen bleiben bestehen.

## Soll-Zustand

Beide Endpoints sollen bei fehlgeschlagenem `git worktree remove` einen Fallback-Cleanup durchführen:

1. `git worktree remove ...` versuchen (wie bisher)
2. Bei Fehler:
   a. `git -C "${mainRepo}" worktree prune` ausführen — räumt stale Worktree-Referenzen auf
   b. Prüfen ob das Worktree-Verzeichnis noch existiert (`fs.existsSync`)
   c. Falls ja: Verzeichnis rekursiv löschen (`fs.rmSync(wtResolved, { recursive: true, force: true })`)
3. Anschließend normal weiter mit Branch-Deletion (bei `/worktree-delete`)
4. Response soll den Cleanup-Pfad dokumentieren: `{ success: true, removedWorktree: true, pruned: true, dirRemoved: true }`

### Für `/worktree-remove` (Legacy)

Gleiche Fallback-Logik: Bei Fehler `git worktree prune` + Verzeichnis löschen. Da hier kein `projectPath` mitgegeben wird, muss der `mainRepo`-Pfad aus dem Worktree-Pfad abgeleitet werden (z.B. `git -C "${worktreePath}" rev-parse --git-common-dir`, Fallback auf Parent-Verzeichnis-Heuristik).

## Constraints

- `fs.rmSync` mit `{ recursive: true, force: true }` nur auf das Worktree-Verzeichnis, NIEMALS auf das Hauptrepo
- Sicherheitscheck: Das zu löschende Verzeichnis muss in einem `-worktrees/`-Unterverzeichnis liegen (Pfad-Validierung), sonst Abbruch
- `git worktree prune` ist safe und kann immer ausgeführt werden
- CHANGELOG.md-Eintrag erforderlich

## Verifikation

1. [ ] Worktree normal erstellen → `git worktree remove` funktioniert wie bisher (kein Regression)
2. [ ] Worktree-Verzeichnis manuell löschen → `/worktree-delete` aufrufen → prune + success (kein Fehler)
3. [ ] Worktree aus Git-Tracking entfernt, aber Verzeichnis noch da → `/worktree-delete` → prune + rmdir + success
4. [ ] Legacy `/worktree-remove` mit gebrochenem Worktree → gleicher Fallback-Cleanup
5. [ ] Sicherheitscheck: Pfad ohne `-worktrees/` → kein `rmSync`, Fehler statt stilles Löschen
6. [ ] Branch wird nach erfolgreichem Cleanup korrekt gelöscht (bei `/worktree-delete` mit `deleteBranch`)

---

# Session-Log

- **Datum:** 2026-03-21T19:10:00
- **Branch:** bugfix/bugfix-worktree-delete-broken-state
- **Ergebnis:** Erfolgreich

## Zusammenfassung
Fallback-Cleanup für `/worktree-delete` und `/worktree-remove` implementiert. Bei fehlgeschlagenem `git worktree remove` wird jetzt `git worktree prune` ausgeführt und das Verzeichnis rekursiv gelöscht — mit Sicherheitscheck auf `-worktrees/` im Pfad.

## Geänderte Dateien
- `companion/kanprompt-companion.js` — Fallback-Cleanup in `/worktree-delete` (try-catch um remove + prune + rmSync) und `/worktree-remove` (auf async/await umgestellt + gleicher Fallback)
- `CHANGELOG.md` — Neuer [1.3.1]-Eintrag für den Bugfix

## Abweichungen vom Prompt
Keine.

## Offene Punkte
Keine.
