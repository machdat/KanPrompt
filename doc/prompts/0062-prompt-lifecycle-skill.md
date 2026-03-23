# Prompt-Lifecycle: Prozessdefinition

## Problem / Motivation

Die Umsetzung einer Prompt-Karte durchläuft immer denselben Lebenszyklus — von der Idee bis zum Merge. Dieser Prozess verteilt sich auf **drei Akteure** mit unterschiedlichen Stärken:

- **KanPrompt** — der zentrale Zustandshalter und Dokumentationsort
- **Cowork** — der Gesprächspartner für Analyse, Diskussion und Review
- **Claude Code (CC)** — der Umsetzer im Projektverzeichnis

Bisher ist dieser Ablauf nirgends übergreifend definiert. Schritte werden vergessen (Session-Log, CHANGELOG, Version-Bump), die Aufgabenteilung zwischen Cowork und CC ist unklar, und KanPrompts Rolle als Angelpunkt wird nicht systematisch genutzt.

Ziel: Eine **verbindliche Prozessdefinition**, die den gesamten Lebenszyklus beschreibt, Verantwortlichkeiten klar zuordnet und als Grundlage für die konkreten Skills in Cowork und CC dient.
## Betroffene Dateien

- `doc/process/prompt-lifecycle.md` — Die Prozessdefinition selbst (neu)
- Cowork-Skill für Kartenerstellung → separate Karte #0092
- CC-Skill für Kartenabarbeitung → separate Karte (noch zu erstellen)

## Die drei Akteure

### KanPrompt — Angelpunkt und Single Source of Truth

KanPrompt ist **nicht** bloß ein passives Board. Es ist der zentrale Ort, an dem:

- **Priorisiert** wird: Das Backlog bestimmt, was als nächstes dran ist
- **Beauftragt** wird: Die Prompt-Karte ist der vollständige Auftrag an CC — mit Problem, Soll-Zustand, Constraints und Verifikation
- **Dokumentiert** wird: Der Session-Log in jeder Karte hält fest, was umgesetzt wurde, welche Entscheidungen getroffen wurden, und warum
- **Zustand gehalten** wird: Über die Companion-API kennt KanPrompt den Status jeder Karte (new → in-progress → done)
Die Companion-API (`http://127.0.0.1:9177`) ist die Schnittstelle, über die sowohl Cowork als auch CC mit KanPrompt kommunizieren. Beide Akteure greifen **ausschließlich** über die API auf Kartenstatus, Registrierung und Projektdaten zu — kein direktes Schreiben in JSON-Dateien.

### Cowork — Gesprächspartner und Qualitätssicherer

Cowork arbeitet **mit dem User zusammen**. Seine Stärken:

- **Analyse**: Code projektübergreifend durchsuchen (via Desktop Commander), Ist-Zustand verstehen
- **Dialog**: Anforderungen klären, Lösungsansätze diskutieren, Feedback-Schleifen
- **Formulierung**: Prompt-Karten schreiben, die präzise genug sind, damit CC autonom arbeiten kann
- **Review**: Ergebnisse nach CC-Umsetzung prüfen, PR reviewen

Cowork erreicht den Projektcode über Desktop Commander (da Projektordner oft außerhalb des Home-Verzeichnisses liegen) und die Companion-API über temporäre Node.js-Scripte.
### Claude Code (CC) — Umsetzer im Projektverzeichnis

CC arbeitet **direkt im Code**. Seine Stärken:

- **Implementierung**: Code schreiben, Tests ausführen, Fehler beheben
- **Git-Operationen**: Branch erstellen, Commits, Push, PR erstellen
- **Abschluss-Pflichten**: Session-Log, CHANGELOG, Version-Bump — alles in einem Commit
- **Autonomie**: CC arbeitet die Prompt-Karte selbstständig ab, solange sie präzise formuliert ist

CC läuft im Projektverzeichnis (oder einem Git-Worktree) und greift über die Companion-API auf KanPrompt zu, um Status-Updates zu melden.

## Der Lebenszyklus — Phasen und Verantwortlichkeiten

### Phase 1: Karte erstellen
**Verantwortlich: Cowork + User**

1. User beschreibt Feature/Bug im Gespräch mit Cowork
2. Cowork analysiert den Projektcode (Desktop Commander), identifiziert betroffene Dateien und Ist-Zustand
3. Cowork generiert Prompt-Inhalt nach Standard-Template (Problem, Ist/Soll, Constraints, Verifikation)
4. User reviewt und gibt Feedback → Cowork arbeitet ein
5. Nach Bestätigung: `POST /api/projects/{id}/create-card`
**→ Konkreter Skill: Karte #0092 (Cowork-Skill: CC-Prompt erstellen)**

**→ KanPrompt danach:** Karte ist registriert, Status `new`, sichtbar im Board.

### Phase 2: Priorisierung und Freigabe
**Verantwortlich: User + KanPrompt**

1. User ordnet die Karte im Backlog ein (Drag & Drop in KanPrompt)
2. User entscheidet, wann die Karte aufgenommen wird
3. KanPrompt zeigt den aktuellen Backlog-Stand — die Reihenfolge ist die Wahrheit

**→ Kein Skill nötig — das ist die manuelle, menschliche Entscheidung.**

### Phase 3: Karte aufnehmen und umsetzen
**Verantwortlich: CC**

1. Karte lesen und verstehen (Problem, Soll-Zustand, Constraints)
2. Status auf `in-progress` setzen: `PATCH /api/projects/{id}/cards/{cardId}/status`
3. Feature-Branch erstellen (nach `branchPattern` aus der Projects Registry)
4. Optional: Git-Worktree anlegen und in Registry registrieren
5. Implementierung gemäß Soll-Zustand
6. Verifikation-Checkliste Punkt für Punkt abarbeiten
**→ Konkreter Skill: CC-Prompt-Lifecycle-Skill (noch zu erstellen als separate Karte)**

### Phase 4: Abschließen
**Verantwortlich: CC**

1. **Session-Log** in die Prompt-Karte schreiben (Pflicht — ohne Session-Log kein Abschluss)
2. **CHANGELOG.md**-Eintrag hinzufügen
3. **Version** in `versionFiles` bumpen (gemäß `type`: bugfix → patch, feature → minor, release → major)
4. Status auf `done` setzen: `PATCH /api/projects/{id}/cards/{cardId}/status`
5. Git-Commit (alle Änderungen inkl. Prompt-Karte, CHANGELOG, Version)
6. Git-Push und PR erstellen: `gh pr create --base {mainBranch} --head {branch}`

**→ KanPrompt danach:** Karte ist `done`, Session-Log dokumentiert Entscheidungen und Ergebnis.

### Phase 5: Review und Merge
**Verantwortlich: Cowork + User (optional CC für Merge)**

1. User/Cowork prüft den PR (Code-Diff, Session-Log, CHANGELOG)
2. Bei Feedback: CC arbeitet nach → zurück zu Phase 3/4
3. Nach Freigabe: Merge (`gh pr merge`), Branch/Worktree aufräumen
4. Worktree aus Registry entfernen, Snapshot auslösen: `POST /api/projects/{id}/snapshot`
**→ KanPrompt danach:** Karte ist abgeschlossen und archiviert. Session-Log bleibt als Dokumentation erhalten.

## Schnittstelle: Die Companion-API als Bindeglied

Alle drei Akteure kommunizieren über die Companion-API. Die wichtigsten Endpunkte im Lifecycle:

| Phase | Endpunkt | Aufrufer |
|-------|----------|----------|
| Kartenerstellung | `POST /api/projects/{id}/create-card` | Cowork |
| Projektdaten laden | `GET /api/projects/{id}` | Cowork, CC |
| Status ändern | `PATCH /api/projects/{id}/cards/{cardId}/status` | CC |
| Worktree registrieren | `PUT /api/projects/{id}/worktrees/{branch}` | CC |
| Worktree entfernen | `DELETE /api/projects/{id}/worktrees/{branch}` | CC |
| Konsistenzprüfung | `GET /api/projects/{id}/reconcile` | Cowork, CC |
| Snapshot | `POST /api/projects/{id}/snapshot` | CC |

## Abgrenzung: Was diese Karte NICHT ist
Diese Karte definiert den **Prozess**. Die konkreten Skill-Implementierungen sind separate Karten:

- **#0092** — Cowork-Skill für Phase 1 (Karte erstellen)
- **Neue Karte (noch zu erstellen)** — CC-Skill für Phase 3–5 (Aufnehmen, Umsetzen, Abschließen, Ausliefern)

Diese Karte ist **erledigt**, wenn die Prozessdefinition als `doc/process/prompt-lifecycle.md` im KanPrompt-Repo liegt und von den Skill-Karten referenziert wird.

## Constraints

- Kein Hardcoding von Pfaden — alle Projektdaten kommen aus der Projects Registry
- Session-Log ist **Pflicht** — der Prozess erlaubt keinen Abschluss ohne Session-Log
- Die Prozessdefinition ist generisch — funktioniert für jedes registrierte Projekt
- Cowork und CC dürfen nur über die Companion-API mit KanPrompt kommunizieren
- Phase 2 (Priorisierung) bleibt bewusst manuell — keine Automatisierung der Entscheidung

## Verifikation

1. [ ] Prozessdefinition liegt als `doc/process/prompt-lifecycle.md` im Repo
2. [ ] Alle drei Akteure (KanPrompt, Cowork, CC) sind mit Rollen und Verantwortlichkeiten beschrieben
3. [ ] Alle Phasen sind definiert mit klarer Zuordnung wer verantwortlich ist
4. [ ] API-Schnittstellen pro Phase dokumentiert
5. [ ] #0092 referenziert die Prozessdefinition als übergeordnetes Dokument
6. [ ] CC-Skill-Karte ist erstellt und referenziert die Prozessdefinition
7. [ ] Prozess funktioniert für KanPrompt UND erju_wp27 (generisch)

---

# Session-Log — Pflichtaufgabe nach Abschluss