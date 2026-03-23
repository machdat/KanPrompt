# Companion: Atomarer `create-card`-Endpoint

## Problem / Motivation

Beim Erstellen einer neuen Prompt-Karte über die API sind aktuell 4 Schritte nötig: Nummer abfragen, Datei anlegen, per PUT registrieren, Reconcile prüfen. Dabei kommt es leicht zu Nummern-Mismatches (Dateiprefix ≠ Registry-Num), weil `nextNum` nicht atomar vergeben wird und `auto-sync` bei Umbenennungen neue Nummern vergibt.

Ziel: Ein einzelner Endpoint, der Datei UND Registry-Eintrag atomar anlegt — Nummer und Dateiname sind garantiert synchron.

## Betroffene Dateien

- `companion/kanprompt-companion.js` — Neuer Endpoint `POST /api/projects/:id/create-card`

## Ist-Zustand

- Karten werden entweder manuell als .md-Datei angelegt + per `auto-sync` importiert (Nummer wird von `nextNum` vergeben, Dateiprefix stimmt nicht überein)
- Oder per `PUT /api/projects/:id/cards/:num` registriert, wobei `nextNum` NICHT hochgezählt wird → Kollisionsgefahr
- Es gibt keinen Endpoint, der Datei + Registry in einem Schritt anlegt

## Soll-Zustand

### Neuer Endpoint: `POST /api/projects/:id/create-card`

**Request:**
```json
{
  "title": "Dispatch: Add-Form Verbesserungen",
  "type": "feature",
  "content": "# Dispatch: Add-Form Verbesserungen\n\n## Problem / Motivation\n..."
}
```

**Response (201 Created):**
```json
{
  "action": "created",
  "card": {
    "id": "0091",
    "num": 91,
    "file": "0091-dispatch-add-form-verbesserungen.md",
    "title": "Dispatch: Add-Form Verbesserungen",
    "type": "feature",
    "status": "new",
    "timestamps": {
      "new": "2026-03-23T14:00:00",
      "in-progress": null,
      "done": null,
      "deleted": null
    }
  }
}
```

### Interner Ablauf (atomar)

1. Projekt aus Registry laden → `404` falls nicht gefunden
2. `title` validieren → `400` falls leer
3. `nextNum` lesen (z.B. 91)
4. Slug aus Titel ableiten: `"Dispatch: Add-Form Verbesserungen"` → `dispatch-add-form-verbesserungen`
   - Slugify-Regeln: lowercase, Umlaute ersetzen (ä→ae, ö→oe, ü→ue, ß→ss), Sonderzeichen durch `-` ersetzen, mehrfache `-` zusammenfassen, führende/trailing `-` entfernen
5. Dateiname zusammenbauen: `0091-dispatch-add-form-verbesserungen.md` (Num 4-stellig, zero-padded)
6. Prüfen ob Datei bereits existiert → `409 Conflict` falls ja
7. Datei schreiben in `{projectPath}/{promptsDir}/{filename}`
   - Falls `content` übergeben: direkt als Dateiinhalt schreiben
   - Falls `content` fehlt: Minimal-Template schreiben: `# {title}\n\n## Problem / Motivation\n\n...\n\n---\n\n# Session-Log — Pflichtaufgabe nach Abschluss\n`
8. Card-Objekt in `project.cards[]` anlegen: `{ id: "0091", file, title, type, num: 91, status: "new", timestamps: { new: ISO-now, ... }, blocked: false, blockedBy: null }`
9. `nextNum` auf 92 hochzählen
10. `saveRegistry()`
11. Response mit Card-Objekt zurückgeben

### Fehlerbehandlung

| Fehler | Status | Response |
|--------|--------|----------|
| Projekt nicht gefunden | 404 | `{ "error": "Projekt nicht gefunden: xyz" }` |
| `title` fehlt | 400 | `{ "error": "title required" }` |
| Datei existiert bereits | 409 | `{ "error": "Datei existiert bereits: 0091-..." }` |
| Schreibfehler auf Disk | 500 | `{ "error": "Datei konnte nicht geschrieben werden: ..." }` — Registry bleibt unverändert (Rollback) |

### Optionale Request-Felder

| Feld | Default | Beschreibung |
|------|---------|--------------|
| `title` | **Pflicht** | Titel der Karte |
| `type` | `"feature"` | Kartentyp: `feature`, `bugfix`, `release` |
| `content` | Minimal-Template | Vollständiger Markdown-Inhalt der Datei |
| `slug` | aus Titel abgeleitet | Manueller Override für den Dateinamen-Slug |
| `status` | `"new"` | Initialer Status (z.B. auch `"in-progress"`) |

### Bugfix: `PUT /cards/:num` soll `nextNum` hochzählen

Zusätzlich zum neuen Endpoint: Der bestehende `PUT /api/projects/:id/cards/:num` soll `nextNum` auf `max(nextNum, num + 1)` setzen, falls die übergebene Num >= aktuellem nextNum ist. Damit wird auch bei direkter PUT-Nutzung keine Kollision erzeugt.

## Constraints

- Nur `companion/kanprompt-companion.js` ändern
- Slugify muss deutsche Umlaute korrekt behandeln
- Datei wird ERST geschrieben, dann Registry aktualisiert — bei Schreibfehler kein Registry-Eintrag
- CHANGELOG.md-Eintrag erforderlich
- Bestehende Endpoints (`PUT /cards/:num`, `auto-sync`) bleiben abwärtskompatibel

## Verifikation

1. [ ] `POST /api/projects/KanPrompt/create-card` mit `{ title, type, content }` → 201 + Card-Objekt
2. [ ] Datei auf Disk hat korrekten Namen mit zero-padded Num-Prefix
3. [ ] Dateiinhalt == übergebener `content`
4. [ ] `nextNum` wurde hochgezählt
5. [ ] `GET /api/projects/KanPrompt/reconcile` → `inSync: true`
6. [ ] Ohne `content` → Minimal-Template wird geschrieben
7. [ ] Titel mit Umlauten → Slug korrekt (ä→ae etc.)
8. [ ] Datei existiert bereits → `409 Conflict`, Registry unverändert
9. [ ] `PUT /cards/:num` mit Num >= nextNum → nextNum wird angepasst
10. [ ] Zwei `create-card` Aufrufe hintereinander → aufsteigende Nummern, keine Kollision

---

# Session-Log — Pflichtaufgabe nach Abschluss
