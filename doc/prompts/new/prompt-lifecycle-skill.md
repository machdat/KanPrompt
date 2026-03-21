# Prompt-Abwicklungs-Skill: Kompletter Lebenszyklus

## Problem / Motivation

Die Prompt-Abwicklung (von Kartenerstellung bis Merge auf main) folgt immer dem gleichen Ablauf, wird aber aktuell manuell oder ad-hoc durchgeführt. Schritte werden vergessen (Session-Log, CHANGELOG, Version-Bump, Status-Update), der Ablauf ist nicht standardisiert.

Ziel: Ein Claude-Skill, der den **gesamten Lebenszyklus einer Promptkarte** kodifiziert — von der Idee bis zum Merge. Generisch einsetzbar für jedes Projekt, das in der Projects Registry (#63) registriert ist.

## Betroffene Dateien

- `/mnt/skills/user/prompt-lifecycle/SKILL.md` — Der Skill selbst (neu)
- Projects Registry (aus #63) — wird vom Skill als Datenquelle und für Status-Updates genutzt

## Ist-Zustand

- Kein formalisierter Ablauf — jede Prompt-Umsetzung wird individuell durchgeführt
- Session-Log wird manchmal vergessen
- CHANGELOG-Eintrag wird manchmal vergessen
- Version-Bump wird manchmal vergessen
- Kartenstatus wird manchmal nicht aktualisiert
- Branch-Management (Erstellen, Push, PR, Merge) ist manuell

## Soll-Zustand

### 1. Skill-Trigger

Der Skill wird aktiv bei Formulierungen wie:
- "Erstelle eine Karte für ..."
- "Nimm Karte #N auf" / "Starte Prompt #N"
- "Setze Prompt X um"
- "Arbeite Karte #N ab"
- "Schließe Karte #N ab"
- "Merge Karte #N"

### 2. Rahmenparameter

Alle Rahmenparameter werden aus der Projects Registry bezogen (`GET /api/projects/:id`):
- `projectPath`, `gitRemote`, `worktreeBase`, `mainBranch`
- `worktreeBaseDir`, `promptsDir`, `versionFiles`, `changelogFile`
- `branchPattern`

Kein Hardcoding von Pfaden oder Branch-Namen im Skill.

### 3. Phasen

#### Phase 1: Karte erstellen
1. Bestehende Karte als Formatreferenz lesen
2. Neue Karte als Markdown-Datei in `{promptsDir}/` schreiben
3. Karte in Registry registrieren: `PUT /api/projects/:id/cards/:cardId`
4. `nextNum` in der Registry wird automatisch inkrementiert

#### Phase 2: Karte aufnehmen
1. Karte aus Registry laden: `GET /api/projects/:id/cards/:cardId`
2. Prüfen ob kein anderer Worktree für diese Karte `in-progress` ist (Doppelstart-Schutz)
3. Status auf `in-progress` setzen: `PATCH /api/projects/:id/cards/:cardId/status`
4. Feature-Branch aus `worktreeBase` erstellen (nach `branchPattern`)
5. Worktree anlegen in `worktreeBaseDir` (falls gewünscht)
6. Worktree in Registry registrieren: `PUT /api/projects/:id/worktrees/:branch`

#### Phase 3: Implementieren
1. Promptkarte lesen — Problem, Soll-Zustand, Constraints verstehen
2. Betroffene Dateien lesen (Ist-Zustand verifizieren)
3. Implementierung gemäß Soll-Zustand
4. Verifikation-Checkliste Punkt für Punkt abarbeiten

#### Phase 4: Abschließen
1. Session-Log in die Promptkarte schreiben (Pflichtaufgabe)
2. CHANGELOG.md-Eintrag hinzufügen
3. Version in `versionFiles` bumpen
4. Status auf `done` setzen: `PATCH /api/projects/:id/cards/:cardId/status`
5. Worktree-Status auf `done` setzen: `PUT /api/projects/:id/worktrees/:branch`
6. Git commit (alle Änderungen inkl. Promptkarte, CHANGELOG, Version)

#### Phase 5: Ausliefern
1. Git push auf Remote
2. PR erstellen: `gh pr create --base {worktreeBase} --head {branch}`
3. PR merge: `gh pr merge --merge` (oder `--squash` je nach Präferenz)
4. Worktree aufräumen: `git worktree remove`, Branch löschen
5. Worktree aus Registry entfernen: `DELETE /api/projects/:id/worktrees/:branch`
6. Worktree-Status in Registry auf `merged` setzen
7. Snapshot auslösen: `POST /api/projects/:id/snapshot`

### 4. Zustandserkennung

Der Skill erkennt den aktuellen Zustand einer Karte und weiß, was als nächstes dran ist:
- Karte existiert nicht → Phase 1 (Erstellen)
- Status `new` → Phase 2 (Aufnehmen)
- Status `in-progress` → Phase 3/4 (Implementieren/Abschließen)
- Status `done` + Worktree vorhanden → Phase 5 (Ausliefern)
- Status `done` + kein Worktree → Fertig

### 5. Git-Commit-Handling

- Commit-Messages folgen dem Schema: `#{num} {title} — {phase}` (z.B. `#63 Projects Registry — Implementation`)
- Sonderzeichen (Umlaute, Klammern) werden über die temporäre `.bat`-Datei-Methode gehandhabt
- `C:\Users\christian.mangold\_tmp.bat` → `cmd /c` → löschen

### 6. Fehlerbehandlung

- Bei Fehler in einer Phase: Status bleibt auf dem letzten erfolgreichen Stand
- `error`-Feld im Worktree-Eintrag wird gesetzt
- `resumeChatId` wird gespeichert für spätere Fortsetzung
- Skill kann an jeder Phase wieder aufsetzen (idempotent)

## Constraints

- Skill darf nie `git push --force` verwenden
- Skill darf nie Dateien löschen, die nicht zum Prompt gehören
- Session-Log ist **Pflicht** — Skill darf Phase 4 nicht ohne Session-Log abschließen
- Alle Pfade aus der Registry, kein Hardcoding
- Skill nutzt ausschließlich die Registry-API für Statusänderungen (kein direktes Schreiben in JSON-Dateien)
- Setzt #63 (Projects Registry) und #64 (UI Migration) voraus

## Verifikation

1. [ ] "Erstelle eine Karte für Feature X" → Karte wird in `promptsDir` erstellt, in Registry registriert
2. [ ] "Starte Prompt #63" → Status `in-progress`, Feature-Branch erstellt, Worktree angelegt
3. [ ] Doppelstart-Schutz: Zweiter Start derselben Karte wird abgelehnt
4. [ ] Nach Implementierung: Session-Log, CHANGELOG, Version-Bump sind alle vorhanden
5. [ ] "Merge Karte #63" → Push, PR, Merge, Worktree-Cleanup, Registry aktualisiert
6. [ ] Abbruch mitten in Phase 3 → Resume möglich, Zustand konsistent
7. [ ] Skill funktioniert für KanPrompt UND für erju_wp27 (generisch)
8. [ ] Keine hardcodierten Pfade im Skill

---

# Session-Log — Pflichtaufgabe nach Abschluss
