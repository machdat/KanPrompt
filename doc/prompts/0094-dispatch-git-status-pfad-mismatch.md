# Dispatch: Git-Status Pfad-Mismatch fixen — Projektpfad nur an einer Stelle halten

## Problem / Motivation

Der Git-Status auf der Dispatch-Seite zeigt „nicht verfügbar" für KanPrompt, obwohl das Repo existiert. Ursache ist eine zweistufige Pfad-Inkonsistenz:

1. **Stale Path in Registry:** `companion/projects-registry.json` enthielt den alten Pfad (`C:\git\local\KanPrompt`). Nach dem Repo-Umzug (#93) muss dieser manuell aktualisiert werden — es gibt keine automatische Erkennung.

2. **Schlüssel-Mismatch bei Git-Status-Lookup:** Der Companion speichert Git-Status-Ergebnisse unter `results[path.resolve(pp)]` (kanprompt-companion.js, ca. Zeile 1574/1577), aber die Dispatch-Seite liest mit `result.results[p.path]` (ca. Zeile 1102). Falls `path.resolve()` den Pfad normalisiert (z.B. Groß-/Kleinschreibung, Trailing-Slash, Slash-Richtung), stimmt der Key nie überein.

### Grundsätzliches Problem

Der Projektpfad wird an mehreren Stellen gehalten und muss manuell synchron gehalten werden:
- `projects-registry.json` → `projectPath`
- `/projects`-Endpoint → gibt `p.path` zurück
- `/git-status-all` → speichert unter `path.resolve(pp)`
- Dispatch-Frontend → liest mit `p.path`

## Betroffene Dateien

- `companion/kanprompt-companion.js` — `/git-status-all`-Endpoint (Schlüssel-Normalisierung)
- `companion/project-utils.js` — `/projects`-Endpoint (Pfad-Auflösung)
- `companion/dispatch.html` — Git-Status-Anzeige (Key-Lookup)
- `companion/projects-registry.json` — projectPath (Source of Truth)

## Soll-Zustand

1. **Pfad-Normalisierung:** Der Companion normalisiert den Pfad **einmal** beim Laden aus der Registry (z.B. via `path.resolve()`), und alle Endpoints verwenden konsistent diesen normalisierten Pfad.
2. **Konsistenter Key:** `/git-status-all` und Dispatch verwenden denselben Key für den Lookup — entweder beide `path.resolve()` oder beide den Original-Pfad.
3. **Single Source of Truth:** Der Projektpfad wird nur in `projects-registry.json` gepflegt. Alle anderen Stellen leiten ihn daraus ab.

## Lösungsansatz

### Option A: Normalisierung im Companion (empfohlen)

In `project-utils.js` beim Laden der Registry den Pfad sofort normalisieren:
```javascript
const normalizedPath = path.resolve(project.projectPath);
```
Alle Endpoints (`/projects`, `/git-status-all`, etc.) verwenden dann `normalizedPath`. Die Dispatch-Seite bekommt bereits den normalisierten Pfad und der Key-Lookup stimmt automatisch.

### Option B: Normalisierung im Frontend

Dispatch normalisiert den Key beim Lookup. Weniger robust, da die Normalisierung im Browser anders ausfallen kann als in Node.js.

## Constraints

- Keine Breaking Changes an der Registry-Struktur
- Bestehende Projekte müssen weiterhin funktionieren
- Pfad-Normalisierung muss auf Windows funktionieren (Backslashes, Case-Insensitivity)

## Verifikation

1. [ ] Registry enthält gültigen Pfad → `/api/projects` zeigt keinen Error
2. [ ] `/api/git-status-all` liefert Status für jedes Projekt
3. [ ] Dispatch-Seite zeigt Git-Status (Branch, Clean/Dirty) statt „nicht verfügbar"
4. [ ] Test mit Pfad-Varianten (Trailing-Slash, Mixed-Slashes) → alle matchen korrekt

---

# Session-Log — Pflichtaufgabe nach Abschluss
