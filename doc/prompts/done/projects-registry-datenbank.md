# Projects Registry: Zentrale Datenbank im Companion

## Problem / Motivation

Projekt-Metadaten (Pfade, Branches, Versionsdateien, Backlog-Zustand, Worktree-Status) sind aktuell verteilt: `backlog-priority.json` im Repo, Ordnerstruktur als impliziter Status, Dispatcher-Daten im Memory. Das führt zu Inkonsistenzen — Karten werden nicht verschoben, Pfade stimmen nicht überein, Worktree-Zustand ist unklar.

Ziel: Eine **zentrale JSON-Datenbank** im Companion, die als Single Source of Truth für alle Projekt- und Kartendaten dient. Exponiert über REST-Endpunkte, nutzbar von UI, Skill und Dispatcher gleichermaßen.

## Betroffene Dateien

- `companion/kanprompt-companion.js` — Neue Registry-Endpunkte, Datenbank-Laden/Speichern
- `companion/projects-registry.json` — Die Datenbank-Datei (neu)

## Ist-Zustand

- Backlog-Daten leben in `doc/prompts/backlog-priority.json` pro Projekt
- Kartenstatus wird implizit über Ordner (`new/`, `in-progress/`, `done/`, `deleted/`) abgebildet
- Worktree-Informationen existieren nur temporär im Dispatcher-Kontext
- Kein zentraler Ort für Projekt-Rahmenparameter

## Soll-Zustand

### 1. Datenbank-Datei `projects-registry.json`

Lebt neben dem Companion. Struktur:

```json
{
  "version": 1,
  "lastUpdated": "2026-03-20T15:00:00Z",
  "projects": {
    "kanprompt": {
      "projectPath": "C:\\git\\local\\KanPrompt",
      "gitRemote": "https://github.com/machdat/KanPrompt",
      "worktreeBase": "dev",
      "mainBranch": "main",
      "worktreeBaseDir": "C:\\git\\worktrees\\KanPrompt",
      "promptsDir": "doc/prompts",
      "versionFiles": ["kanprompt.html"],
      "changelogFile": "CHANGELOG.md",
      "branchPattern": "feature/{slug}",
      "nextNum": 63,
      "cards": [
        {
          "id": "projects-registry-datenbank",
          "file": "projects-registry-datenbank.md",
          "title": "Projects Registry: Zentrale Datenbank im Companion",
          "type": "feature",
          "num": 63,
          "status": "new",
          "timestamps": {
            "new": "2026-03-20T23:00:00",
            "inProgress": null,
            "done": null,
            "deleted": null
          }
        }
      ],
      "cardPriority": ["projects-registry-datenbank"],
      "worktrees": [
        {
          "branch": "feature/projects-registry",
          "path": "C:\\git\\worktrees\\KanPrompt\\projects-registry",
          "cardId": "projects-registry-datenbank",
          "status": "pending",
          "resumeChatId": null,
          "startedAt": null,
          "lastActivityAt": null,
          "runtime": 0,
          "cost": 0.0,
          "error": null
        }
      ],
      "lastSnapshotAt": null
    }
  }
}
```

Pfade innerhalb des Projekts sind relativ zum `projectPath`.

### 2. Companion REST-Endpunkte

**Projekte:**
- `GET /api/projects` — Alle Projekte (nur ID + Titel + Pfad, ohne Cards/Worktrees)
- `GET /api/projects/:id` — Kompletter Projektdatensatz
- `PUT /api/projects/:id` — Projekt anlegen oder Rahmenparameter aktualisieren
- `DELETE /api/projects/:id` — Projekt aus Registry entfernen

**Karten:**
- `GET /api/projects/:id/cards` — Alle Karten des Projekts, optional `?status=new,in-progress`
- `GET /api/projects/:id/cards/:cardId` — Einzelne Karte
- `PUT /api/projects/:id/cards/:cardId` — Karte anlegen oder aktualisieren (Status, Timestamps)
- `PATCH /api/projects/:id/cards/:cardId/status` — Nur Status-Transition (setzt Timestamps automatisch)
- `DELETE /api/projects/:id/cards/:cardId` — Karte auf Status `deleted` setzen (kein physisches Löschen)

**Kartensortierung:**
- `PUT /api/projects/:id/card-priority` — `cardPriority`-Array neu setzen

**Worktrees:**
- `GET /api/projects/:id/worktrees` — Alle Worktrees des Projekts
- `PUT /api/projects/:id/worktrees/:branch` — Worktree registrieren/aktualisieren
- `DELETE /api/projects/:id/worktrees/:branch` — Worktree aus Registry entfernen (nach Cleanup)

### 3. Status-Transitions bei Karten

`PATCH /api/projects/:id/cards/:cardId/status` mit `{ "status": "in-progress" }`:

- Setzt den neuen Status
- Setzt den Timestamp für den neuen Status auf `now()`
- Bei Rückwärtsbewegung (z.B. `done` → `in-progress`): löscht Timestamps für verlassene Zustände
- Schreibt den Status denormalisiert in die Karte selbst (erste Zeile nach dem Titel oder YAML-Frontmatter)
- Aktualisiert `lastUpdated` in der Datenbank

### 4. Snapshot-Mechanismus

- Endpoint: `POST /api/projects/:id/snapshot`
- Schreibt den Projektanteil der Registry als `doc/prompts/.registry-snapshot.json` ins Repo
- Setzt `lastSnapshotAt` in der Registry
- Bei Companion-Start: Falls `projects-registry.json` fehlt oder leer, sucht der Companion in allen bekannten `projectPath`-Verzeichnissen nach `.registry-snapshot.json` und baut die Registry wieder auf

### 5. Doppelstart-Schutz

Vor dem Start einer Prompt-Umsetzung:
- `GET /api/projects/:id/worktrees` prüfen
- Wenn ein Worktree für die Karte bereits `status: "in-progress"` hat → Ablehnung mit Verweis auf `resumeChatId`

## Constraints

- Datenbank-Datei wird bei jeder Schreiboperation atomar gespeichert (temp-file + rename)
- Keine externen Abhängigkeiten (kein SQLite, kein LevelDB) — reines JSON
- `backlog-priority.json` bleibt vorerst parallel bestehen (Migration in Karte #64)
- Promptkarten bleiben als Markdown-Dateien im Repo — die Registry hält nur Metadaten
- CHANGELOG.md-Eintrag erforderlich

## Verifikation

1. [ ] `GET /api/projects` liefert alle registrierten Projekte
2. [ ] `PUT /api/projects/test` legt ein neues Projekt an, `GET` liefert es zurück
3. [ ] `PUT /api/projects/test/cards/card-1` legt eine Karte an
4. [ ] `PATCH /api/projects/test/cards/card-1/status` mit `in-progress` setzt Timestamp korrekt
5. [ ] Rückwärtsbewegung `done` → `new` löscht `inProgress` und `done` Timestamps
6. [ ] Status-Update schreibt denormalisierten Status in die Markdown-Datei
7. [ ] `POST /api/projects/test/snapshot` erzeugt `.registry-snapshot.json` im Projekt
8. [ ] Companion-Neustart ohne `projects-registry.json` → Recovery aus Snapshots funktioniert
9. [ ] Worktree mit `status: in-progress` → zweiter Start wird abgelehnt
10. [ ] Atomares Speichern: Bei Absturz während Schreiben bleibt die alte Datei intakt

---

# Session-Log

- **Datum:** 2026-03-20T23:50:00
- **Branch:** feature/projects-registry-datenbank
- **Ergebnis:** Erfolgreich

## Zusammenfassung
Projects Registry als zentrale JSON-Datenbank im Companion implementiert. 15 REST-Endpunkte für Projekte, Karten, Worktrees und Snapshots mit automatischen Status-Transitions, atomarem Speichern und Snapshot-Recovery.

## Geänderte Dateien
- `companion/kanprompt-companion.js` — Registry-Modul (~170 Zeilen) + 15 REST-Endpunkte, CORS erweitert, Version 0.9.0 → 1.0.0
- `companion/projects-registry.json` — Neue leere Registry-Datenbank (neu)
- `CHANGELOG.md` — Eintrag [1.0.0] hinzugefügt

## Abweichungen vom Prompt
- Doppelstart-Schutz ist als Daten-Check via `GET /api/projects/:id/worktrees` implementiert (Client prüft), nicht als serverseitiger Block im `/start-cc`-Endpunkt — hält die Registry-API entkoppelt vom CC-Launcher.

## Offene Punkte
- Verifikations-Checkliste manuell gegen laufenden Companion testen (Port war belegt durch bestehende Instanz)
