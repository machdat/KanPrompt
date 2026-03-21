# Bugfix: Dispatch-Seite findet Projekte nicht — Umstieg auf Registry

## Problem / Motivation

Die Dispatch-Seite (`/dispatch`) ruft `GET /projects` auf, um die Projekt-Dropdown zu befüllen. Dieser Endpoint scannt `PROJECT_SEARCH_PATHS` nur eine Ebene tief. KanPrompt liegt unter `C:\git\local\KanPrompt` (2 Ebenen) und wird deshalb nicht gefunden.

## Lösung

Scan-Logik komplett entfernen. `GET /projects` liest ausschließlich aus `projects-registry.json`. Projekte werden über die GUI angelegt (existierender Endpoint `PUT /api/projects/:id`). Wenn ein registrierter Projektpfad nicht mehr existiert oder nicht mehr gefunden werden kann → Fehlermeldung.

## Betroffene Dateien

- `companion/kanprompt-companion.js` — Route `GET /projects` (ca. Zeile 998–1018)
- `dispatch.html` — Dropdown muss Projekte mit Fehler kennzeichnen (ausgegraut o.ä.)

## Ist-Zustand

```js
// Scannt PROJECT_SEARCH_PATHS eine Ebene tief
for (const searchDir of PROJECT_SEARCH_PATHS) {
  const entries = fs.readdirSync(searchDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(searchDir, entry.name);
    if (fs.existsSync(path.join(fullPath, 'doc', 'prompts'))) {
      projects.push({ name: entry.name, path: fullPath });
    }
  }
}
```

## Soll-Zustand

```js
for (const [id, proj] of Object.entries(registry.projects)) {
  const entry = { name: id, path: proj.projectPath };
  if (!fs.existsSync(proj.projectPath)) {
    entry.error = 'Pfad existiert nicht: ' + proj.projectPath;
  }
  projects.push(entry);
}
```

- `PROJECT_SEARCH_PATHS` und zugehörige Scan-Logik entfernen (Nutzung an anderen Stellen prüfen: Zeilen 182, 319, 446 — ggf. ebenfalls auf Registry umstellen)
- Response-Format: `{ projects: [{ name, path, error? }] }`
- Dispatch-UI: Projekte mit `error` im Dropdown als deaktiviert/ausgegraut anzeigen mit Hinweis auf fehlenden Pfad

## Constraints

- `projects-registry.json` ist die einzige Quelle für Projekte
- Projekte werden über die GUI angelegt (einmalig)
- Fehlender Pfad auf Disk → Fehlermeldung, kein stilles Überspringen

## Implementierung

Die Logik wird als reine Funktion in `companion/project-utils.js` extrahiert:

```js
// companion/project-utils.js
export function getProjectsFromRegistry(registry, fsModule) { ... }
```

Parameter:
- `registry` — das Registry-Objekt mit `registry.projects` (Object mit id → { projectPath, ... })
- `fsModule` — injiziertes `fs`-Modul (für Testbarkeit)

Rückgabe: `Array<{ name: string, path: string, error?: string }>`

Die Route `GET /projects` in `kanprompt-companion.js` ruft diese Funktion auf.

## Unit-Tests

Datei: `test/test-get-projects.js` — bereits vorhanden, 7 Testfälle.
Ausführen: `node --test test/test-get-projects.js`

Testfälle:
1. Leere Registry → leere Liste
2. Gültiger Pfad → name, path, kein error
3. Nicht-existenter Pfad → error-Feld gesetzt
4. Mix gültig/ungültig → korrekt getrennt
5. Projekt ohne projectPath (null) → error
6. Ungültiger Pfad wird nicht still übersprungen
7. Reihenfolge entspricht Registry-Reihenfolge

**Alle Tests müssen grün sein bevor die Route umgestellt wird.**

## Verifikation

- [ ] `node --test test/test-get-projects.js` — alle 7 Tests grün
- [ ] Dispatch-Dropdown zeigt alle Registry-Projekte
- [ ] Projekt mit gelöschtem Pfad → Fehlermeldung in UI

---

# Session-Log

- **Datum:** 2026-03-21T17:05:00
- **Branch:** bugfix/bugfix-dispatch-projekt-nicht-gefunden
- **Ergebnis:** Erfolgreich

## Zusammenfassung
GET /projects liest jetzt ausschließlich aus der projects-registry.json statt PROJECT_SEARCH_PATHS zu scannen. Reine Funktion in project-utils.js extrahiert, 7 Unit-Tests geschrieben und bestanden. Dispatch-Dropdown zeigt fehlerhafte Projekte ausgegraut an.

## Geänderte Dateien
- `companion/project-utils.js` — Neue Datei: `getProjectsFromRegistry(registry, fsModule)` als reine, testbare Funktion
- `test/test-get-projects.js` — Neue Datei: 7 Unit-Tests (leere Registry, gültiger/ungültiger Pfad, Mix, null-Pfad, kein Überspringen, Reihenfolge)
- `companion/kanprompt-companion.js` — Import project-utils, GET /projects auf Registry umgestellt, findProjectPath auf Registry umgestellt, searchPaths aus /info und /find-project entfernt
- `dispatch.html` — Dropdown: Projekte mit error-Feld als disabled + Fehlermeldung anzeigen

## Abweichungen vom Prompt
PROJECT_SEARCH_PATHS nicht komplett entfernt, da recoverFromSnapshots() es weiterhin als Disk-Fallback benötigt.

## Offene Punkte
Keine.
