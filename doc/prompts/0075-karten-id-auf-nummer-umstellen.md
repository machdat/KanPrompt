# Karten-ID auf Nummer umstellen

## Problem / Motivation

Prompt-Karten haben aktuell zwei Identifikatoren: `id` (ein Slug wie `companion-pflicht-schema-migration-entfernen`) und `num` (eine fortlaufende Nummer wie `72`). Die `num` wurde eingeführt, um Karten eindeutig und stabil zu identifizieren — aber der tatsächliche Primary Key in der Registry und den API-Endpunkten ist weiterhin der Slug.

Das ist redundant und fehleranfällig: Slugs werden aus Titeln abgeleitet, können lang und kryptisch werden, und bei Umbenennungen brechen Referenzen (z.B. `blockedBy`). Die Nummer ist der bessere Schlüssel — kurz, stabil, eindeutig.

Ziel: Die Nummer wird zum einzigen Identifikator. Dateinamen, Registry, API-Endpunkte und alle Referenzen verwenden ausschließlich die Nummer.

## Betroffene Dateien

- `companion/kanprompt-companion.js` — Registry-Struktur, alle API-Endpunkte, Migrationslogik für bestehende Karten
- `kanprompt.html` — Alle Stellen, die `card.id` verwenden; Anzeige-Format `#NNNN`
- `dispatch.html` — Falls Karten-IDs referenziert werden
- `doc/prompts/*.md` — Alle bestehenden Prompt-Dateien umbenennen

## Ist-Zustand

- Registry-Eintrag: `{ "id": "companion-pflicht-schema-migration-entfernen", "file": "companion-pflicht-schema-migration-entfernen.md", "num": 72, ... }`
- API-Endpunkte: `/api/projects/:id/cards/:cardId` wobei `:cardId` ein Slug ist
- Dateinamen: `companion-pflicht-schema-migration-entfernen.md`
- Referenzen: `"blockedBy": "companion-pflicht-schema-migration-entfernen"`
- `cardPriority`: Liste von Slugs `["companion-pflicht-schema-migration-entfernen", ...]`
- Anzeige: `#72` wird bereits in der UI gezeigt, hat aber keine Funktion als ID

## Soll-Zustand

### 1. Dateinamensformat

`NNNN-slug.md` — 4-stellig, zero-padded, gefolgt von einem lesbaren Slug.

Beispiel: `0072-companion-pflicht-schema-migration-entfernen.md`

Das `#`-Zeichen ist **nicht** Teil des Dateinamens (Shell-/URL-Probleme), sondern nur ein Anzeige-Prefix in der UI.

### 2. Registry-Struktur

```json
{
  "id": "0072",
  "file": "0072-companion-pflicht-schema-migration-entfernen.md",
  "num": 72,
  "title": "Companion-Pflicht + Schema-Migrationslogik entfernen",
  ...
}
```

- `id` wird zum formatierten Nummer-String `"0072"` (konsistent mit dem Dateinamen-Prefix)
- `num` bleibt als Integer für Berechnungen (z.B. `nextNum++`)
- `file` spiegelt den neuen Dateinamen

### 3. API-Endpunkte

Endpunkte akzeptieren die Nummer als `:cardId`:

```
GET    /api/projects/:id/cards/72
PUT    /api/projects/:id/cards/72
PATCH  /api/projects/:id/cards/72/status
DELETE /api/projects/:id/cards/72
```

Der Companion löst `:cardId` über `num` auf (parseInt, dann Suche in `cards`-Array).

### 4. Referenzen

- `blockedBy`: Nummer als Integer → `"blockedBy": 72`
- `cardPriority`: Liste von Nummern → `[72, 73, 62]`

### 5. Anzeige-Format

Überall in der UI wird die Nummer als `#NNNN` angezeigt: `#0072`. Das `#` ist rein ein UI-Prefix und hat keine Bedeutung in Dateinamen, API oder Registry.

### 6. Einmalige Migration bestehender Karten (externes Skript)

Die Migration wird **nicht** in die Applikation eingebaut, sondern als einmaliges Skript ausgeführt. Das Skript:

1. Liest die `projects-registry.json` des Companions
2. Für jedes Projekt und jede Karte darin:
   - Benennt die physische Datei um: `slug.md` → `NNNN-slug.md` (Slug aus dem bisherigen `id`-Feld)
   - Aktualisiert `id` → formatierte Nummer (`"0072"`)
   - Aktualisiert `file` → neuer Dateiname
3. Konvertiert `cardPriority` → Nummern-Liste
4. Konvertiert `blockedBy`-Referenzen → Nummern
5. Schreibt die aktualisierte `projects-registry.json` zurück
6. `nextNum` bleibt unverändert

Das Skript liegt z.B. als `scripts/migrate-card-ids.js` im Repo und wird einmal manuell ausgeführt. Danach kann es archiviert oder gelöscht werden.

**Slug-Ableitung:** Der bisherige `id`-Wert (z.B. `companion-pflicht-schema-migration-entfernen`) wird als Slug nach der Nummer übernommen. Bei neuen Karten wird der Slug aus dem Titel generiert (wie bisher `id` generiert wurde).

## Umsetzungsreihenfolge

1. **Migrationsskript** — `scripts/migrate-card-ids.js` schreiben und einmalig ausführen (Registry + Dateien aller Projekte migrieren)
2. **Companion: API-Endpunkte** — `:cardId` über `num` auflösen statt über `id`
3. **Companion: Karten-Erstellung** — Bei `PUT /cards/:cardId` neue Karten mit Nummern-basiertem `id` und Dateinamen anlegen
4. **Frontend: Alle `card.id`-Referenzen** — auf `card.num` bzw. formatierte Nummer umstellen
5. **Frontend: Anzeige** — `#NNNN`-Format überall konsistent verwenden
6. **Aufräumen** — Sicherstellen, dass keine alten Slug-Referenzen übrig sind

## Constraints

- **Nummern sind unveränderlich** — Eine einmal vergebene Nummer wird nie recycled und nie geändert
- **Slug bleibt im Dateinamen** — `0072-slug.md`, nicht `0072.md`. Der Slug dient der menschlichen Lesbarkeit im Dateisystem
- **4-stelliges Zero-Padding** — Konsistent, auch für einstellige Nummern (`0001`)
- **Abwärtskompatibilität nicht nötig** — Es gibt keinen externen Consumer der API. Die Migration kann breaking sein.
- **Alle registrierten Projekte migrieren** — Nicht nur KanPrompt, sondern auch z.B. erju_wp27
- CHANGELOG.md-Eintrag erforderlich

## Verifikation

- [ ] Bestehende Karten: Dateien umbenannt zu `NNNN-slug.md`
- [ ] Registry: `id`-Felder sind formatierte Nummern (`"0072"`)
- [ ] Registry: `cardPriority` enthält Nummern
- [ ] Registry: `blockedBy` enthält Nummern
- [ ] API: `GET /api/projects/KanPrompt/cards/72` liefert Karte #72
- [ ] API: `PUT /api/projects/KanPrompt/cards/74` legt neue Karte mit `id: "0074"` an
- [ ] UI: Karten zeigen `#NNNN` als Identifikator
- [ ] Neue Karte erstellen → Dateiname `NNNN-slug.md`, nächste freie Nummer
- [ ] Kein alter Slug-basierter `id`-Wert mehr in der Registry
- [ ] Alle Projekte (KanPrompt, erju_wp27, ...) migriert

---

# Session-Log

- **Datum:** 2026-03-22T03:15:00
- **Branch:** feature/karten-id-auf-nummer-umstellen
- **Ergebnis:** Erfolgreich

## Zusammenfassung
Karten-ID von Slug-basiert auf Nummern-basiert umgestellt. Migrationsskript, Companion-API, Frontend und Dispatch aktualisiert. Alle Dateien, Registry-Einträge und API-Endpunkte verwenden jetzt die Kartennummer als primären Identifikator. Nach der initialen Migration wurden mehrere Nachbesserungen nötig (Race Condition, Sync-Geister, Duplikat-Nummern).

## Geänderte Dateien
- `scripts/migrate-card-ids.js` — Einmaliges Migrationsskript (Registry + Dateien umbenennen, fehlende Nummern vergeben)
- `scripts/cleanup-duplicates.js` — Einmaliges Cleanup-Skript für Sync-Duplikate
- `companion/kanprompt-companion.js` — Card-Lookup per `num`, padNum/findCardByNum-Helper, Karten-Erstellung mit NNNN-Format, Version 1.3.0 → 1.4.0
- `kanprompt.html` — API-Calls auf num, cardPriority/blockedBy auf Nummern, Erstellung mit NNNN-slug.md, Anzeige #NNNN, Sync auf Dateinamen, pendingMutations gegen Race Condition, deletedFiles-Tracking, Version 0.22.1 → 0.23.3
- `dispatch.html` — Branch-Name aus Dateiname, cardId als num, #NNNN-Anzeige
- `CHANGELOG.md` — Neuer Eintrag v1.4.0

## Abweichungen vom Prompt
- Drei Bugfixes nach der Migration nötig: (1) Gelöschte Karten wurden vom Sync re-registriert (deletedFiles fehlte), (2) Race Condition zwischen 3s-Poll und Drag/Drop überschrieb lokalen State mit stale GET-Response, (3) updateDeletedCount fehlte im Registry-Modus
- Duplikat-Nummern (num=1,2,3,72) aus der Legacy-Daten-Migration erforderten manuelles Cleanup
- Migrations-Reihenfolge war kritisch: kanprompt.html muss VOR der Migration installiert werden, sonst erzeugt der alte Sync Geister-Einträge

## Offene Punkte
- Migrationsskript und Cleanup-Skript können archiviert oder gelöscht werden
- erju_wp27/pc2track: Dateien wurden in der Registry umbenannt, physische Dateien waren beim zweiten Migrations-Lauf bereits umbenannt (harmlose "Datei nicht gefunden"-Warnungen)
