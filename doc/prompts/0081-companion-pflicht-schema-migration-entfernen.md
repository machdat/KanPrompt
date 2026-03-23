# Companion-Pflicht + Schema-Migrationslogik entfernen

## Problem / Motivation

Die Schema-Migrationslogik im Frontend (`MIGRATIONS`-Array, Upgrade-Modal, `.kanprompt-version.json`) stammt aus einer Zeit, in der KanPrompt eigenständig ohne Companion funktionieren musste und Projektstrukturen selbst migrieren konnte. Dieser Betriebsmodus ist überholt:

1. **Es gibt keine älteren Projekte mehr**, die migriert werden müssten.
2. **Der Companion ist die autoritative Quelle** für Cards, Status, Prioritäten und Projekt-Metadaten.
3. **Daten-Migrationen gehören in den Companion**, nicht ins Frontend — bei einem Versions-Upgrade des Companions migriert dieser seine eigenen Daten in einem Schritt.
4. **Companion-loser Betrieb wird nicht mehr unterstützt.** KanPrompt verweigert den Dienst, wenn der Companion nicht verfügbar ist.

Das rote "kein Schema ⚠"-Badge im Header (sichtbar wenn `projectSchemaVersion === null`) ist ein Symptom dieses veralteten Designs. Statt es kosmetisch zu korrigieren, wird die gesamte Schema-Migrationslogik entfernt und durch eine einfache Companion-Versionsanzeige ersetzt.

## Betroffene Dateien

- `kanprompt.html` — Entfernung: Migrationslogik, Schema-Badge, Upgrade-Modal, `.kanprompt-version.json`-Handling. Neu: Companion-Pflicht-Prüfung, Companion-Versions-Badge.
- `companion/kanprompt-companion.js` — Neuer Endpunkt `/api/version` (liefert Companion-Version).

## Ist-Zustand

### Frontend (`kanprompt.html`)
- `const SCHEMA_VERSION = '1.2.0'` (Zeile 704)
- `let projectSchemaVersion = null` (Zeile 716) — wird aus `.kanprompt-version.json` im Projekt gelesen (Zeile 1323–1331)
- `const MIGRATIONS = [...]` (Zeile 2533ff.) — Array mit Migrationsschritten
- `getMigrationsNeeded()` — berechnet Migrationskette von `current` nach `SCHEMA_VERSION`
- `updateSchemaBadge()` (Zeile 2633–2652) — drei Zustände: `ok` (grün), `warn` (orange), `missing` (rot)
- `openUpgradeModal()` / `performUpgrade()` — Upgrade-Dialog mit Migrationslog
- HTML: Upgrade-Modal-Overlay (`#upgradeModalOverlay`), Badge-Element (`#schemaBadge`)
- CSS: `.schema-badge`, `.schema-badge.ok`, `.schema-badge.warn`, `.schema-badge.missing`
- `.kanprompt-version.json` wird nach Upgrade geschrieben (Zeile 2727–2735)
- Ohne Companion funktioniert KanPrompt eingeschränkt — es gibt keinen klaren Blockade-Mechanismus

### Companion (`kanprompt-companion.js`)
- Kennt keine eigene Version / kein `/api/version`-Endpunkt
- Kennt kein Schema-Konzept — `projects-registry.json` hat kein `schemaVersion`-Feld

## Soll-Zustand

### 1. Companion-Pflicht beim Start

Beim Öffnen eines Projekts prüft KanPrompt, ob der Companion erreichbar ist. Falls nicht:
- Das Board wird **nicht** geladen
- Stattdessen wird eine Blockade-Meldung angezeigt: "Companion nicht verfügbar — KanPrompt benötigt einen laufenden Companion."
- Retry-Möglichkeit anbieten (Button "Erneut versuchen")
- Kein Fallback-Modus, kein Lesen der letzten `projects-registry.json`

### 2. Companion-Versions-Badge statt Schema-Badge

Neuer Endpunkt im Companion:
```
GET /api/version
Response: { "version": "1.5.0", "uptime": 3600 }
```

Das Badge im Header zeigt die Companion-Version:
- Companion verbunden: `companion 1.5.0 ✓` (grün, wie bisheriges `schema ok`)
- Companion nicht verbunden: wird durch die Blockade-Meldung (Punkt 1) abgedeckt — kein Badge nötig

Der bestehende `companion`-Indikator in der Header-Leiste (grüner/roter Punkt neben "companion") kann als Basis dienen oder damit zusammengelegt werden.

### 3. Entfernung der Schema-Migrationslogik

Komplett entfernen:
- `const SCHEMA_VERSION`
- `let projectSchemaVersion`
- `const MIGRATIONS = [...]` (gesamtes Array)
- `getMigrationsNeeded()`
- `updateSchemaBadge()`
- `openUpgradeModal()` / `closeUpgradeModal()` / `performUpgrade()`
- HTML: `#upgradeModalOverlay` (gesamtes Modal), `#schemaBadge`-Element
- CSS: Alle `.schema-badge.*`-Regeln
- Lesen von `.kanprompt-version.json` (Zeile 1323–1331)
- Schreiben von `.kanprompt-version.json` (Zeile 2727–2735)
- Alle Aufrufe von `updateSchemaBadge()` im Code

### 4. `.kanprompt-version.json` im Projekt

Diese Datei wird nicht mehr gelesen und nicht mehr geschrieben. Bestehende Dateien in Projekten können ignoriert werden — kein aktives Löschen nötig.

## Constraints

- **Kein Companion-loser Fallback**: Es wird kein Code geschrieben, der einen Betrieb ohne Companion ermöglicht. Im Zweifelsfall lieber strikt blockieren.
- **Companion-Version**: Die Version im Companion muss als Konstante gepflegt werden (analog zu `const VERSION` in `kanprompt.html`).
- **Bestehende Companion-Statusanzeige** (grüner/roter Punkt + "companion" im Header) bleibt erhalten oder wird in das neue Badge integriert — nicht ersatzlos entfernen.
- CHANGELOG.md-Eintrag erforderlich.

## Umsetzungsreihenfolge

1. `/api/version`-Endpunkt im Companion implementieren
2. Companion-Pflicht-Prüfung beim Projektöffnen + Blockade-UI
3. Schema-Migrationslogik komplett entfernen (JS + HTML + CSS)
4. Badge auf Companion-Version umstellen
5. Aufräumen: toten Code suchen, Referenzen auf `projectSchemaVersion` / `SCHEMA_VERSION` eliminieren

## Verifikation

- [ ] Companion läuft → Projekt öffnet normal, Badge zeigt `companion X.Y.Z ✓`
- [ ] Companion gestoppt → Blockade-Meldung, Board wird nicht geladen
- [ ] "Erneut versuchen" nach Companion-Start → Board lädt
- [ ] Kein `SCHEMA_VERSION`, `MIGRATIONS`, `projectSchemaVersion` mehr im Code
- [ ] Kein `#upgradeModalOverlay` im HTML
- [ ] Keine `.schema-badge`-CSS-Regeln
- [ ] `.kanprompt-version.json` wird weder gelesen noch geschrieben
- [ ] `GET /api/version` liefert `{ "version": "...", "uptime": ... }`
- [ ] CHANGELOG.md enthält Eintrag

---

# Session-Log

- **Datum:** 2026-03-22T14:30:00
- **Branch:** bugfix/0081-companion-pflicht-schema-migration-entfernen
- **Ergebnis:** Erfolgreich

## Zusammenfassung
Schema-Migrationslogik komplett aus kanprompt.html entfernt (MIGRATIONS-Array, Upgrade-Modal, .kanprompt-version.json-Handling, updateSchemaBadge etc.). Companion-Pflicht-Prüfung mit Blockade-UI eingebaut. Neuer `/api/version`-Endpunkt im Companion. Schema-Badge durch Companion-Version-Badge ersetzt.

## Geänderte Dateien
- `companion/kanprompt-companion.js` — Version auf 1.5.0, neuer `GET /api/version`-Endpunkt, /info-Endpunkt aktualisiert
- `kanprompt.html` — Version auf 0.24.0, Schema-Migration komplett entfernt (CSS, HTML, JS), Companion-Pflicht-Blockade + Retry, Companion-Version-Badge, `updateProjectVersionFile()` entfernt
- `CHANGELOG.md` — Neuer Eintrag [1.5.0]

## Abweichungen vom Prompt
Keine.

## Offene Punkte
Keine.
