# Bugfix: Gelöschte Karte erscheint nach Sync wieder (Registry-Modus)

## Problem / Motivation

Im Registry-Modus wird eine Karte per `deleteItem()` → `registryDeleteCard()` gelöscht. Der Companion setzt `card.status = 'deleted'` in der Registry. `registryToJsonData()` filtert gelöschte Karten korrekt aus (`if (card.status === 'deleted') continue`), sodass die Karte sofort vom Board verschwindet.

Aber: `syncFolderToJson()` (Registry-Modus, läuft alle 15 Sekunden) scannt das `doc/prompts/`-Verzeichnis auf Disk nach `.md`-Dateien. Es baut `allIds` nur aus den **sichtbaren** Spalten (backlog, inProgress, done). Gelöschte Karten fehlen in dieser Menge. Die `.md`-Datei existiert aber noch auf Disk → Sync erkennt sie als "neue" Datei → registriert sie via `registryPutCard()` mit `status: 'new'` → Karte taucht wieder auf.

## Betroffene Dateien

- `kanprompt.html` — Funktion `registryToJsonData()` (ca. Zeile 1007–1031): muss gelöschte Karten-IDs durchreichen
- `kanprompt.html` — Funktion `syncFolderToJson()` (ca. Zeile 1548–1577, Registry-Zweig): muss gelöschte IDs beim Abgleich berücksichtigen

## Ist-Zustand

`registryToJsonData()` überspringt gelöschte Karten komplett:

```js
for (const card of (data.cards || [])) {
  if (card.status === 'deleted') continue; // ← gelöschte IDs gehen verloren
  // ...
}
```

`syncFolderToJson()` baut `allIds` nur aus sichtbaren Spalten:

```js
const allIds = new Set();
for (const c of COLUMNS) for (const item of (jsonData[c.jsonKey] || [])) allIds.add(item.id);
// → gelöschte Karten-IDs fehlen
for (const f of diskFiles) {
  const id = f.replace('.md', '');
  if (allIds.has(id)) continue; // ← gelöschte ID nicht enthalten → wird neu registriert
  await registryPutCard(id, { file: f, title, type: 'bugfix', status: 'new' });
}
```

## Soll-Zustand

`registryToJsonData()` sammelt gelöschte Karten-IDs in einem eigenen Feld:

```js
function registryToJsonData(data) {
  const jd = { backlog: [], inProgress: [], done: [], nextNum: data.nextNum || 1, deletedIds: new Set() };
  // ...
  for (const card of (data.cards || [])) {
    if (card.status === 'deleted') { jd.deletedIds.add(card.id); continue; }
    // ... wie bisher
  }
  return jd;
}
```

`syncFolderToJson()` bezieht `deletedIds` in die Prüfung ein:

```js
const allIds = new Set();
for (const c of COLUMNS) for (const item of (jsonData[c.jsonKey] || [])) allIds.add(item.id);
// Gelöschte IDs ebenfalls berücksichtigen:
if (jsonData.deletedIds) jsonData.deletedIds.forEach(id => allIds.add(id));
```

## Constraints

- Die Dateiposition dieser Prompt-Karte im Verzeichnis darf NICHT verändert werden
- `registryToJsonData()` darf das bestehende Mapping (backlog/inProgress/done) nicht verändern
- `deletedIds` dient nur als Ausschlussliste für den Sync — gelöschte Karten werden weiterhin NICHT auf dem Board angezeigt
- Kein Einfluss auf das Deleted-Overlay (das lädt seine Daten separat via `?status=deleted`)

## Verifikation

1. Karte löschen → verschwindet vom Board
2. 15+ Sekunden warten (mindestens ein Sync-Zyklus) → Karte bleibt gelöscht
3. Manuell 🔄 Aktualisieren klicken → Karte bleibt gelöscht
4. Deleted-Overlay öffnen → gelöschte Karte erscheint dort korrekt
5. Neue `.md`-Datei auf Disk anlegen → wird weiterhin korrekt als neue Karte erkannt und registriert

---

# Session-Log

- **Datum:** 2026-03-21T16:25:18
- **Branch:** bugfix/prompt-karte-laesst-sich-nicht-loeshen
- **Ergebnis:** Erfolgreich

## Zusammenfassung
`registryToJsonData()` sammelt gelöschte Karten-IDs jetzt in einem `deletedIds`-Set, das `syncFolderToJson()` beim Disk-Scan berücksichtigt. Dadurch werden gelöschte Karten nicht mehr fälschlich als neue Karten re-registriert.

## Geänderte Dateien
- `kanprompt.html` — `registryToJsonData()`: `deletedIds: new Set()` hinzugefügt, gelöschte IDs gesammelt statt nur übersprungen
- `kanprompt.html` — `syncFolderToJson()`: `deletedIds` in `allIds`-Menge einbezogen
- `kanprompt.html` — Version-Bump 0.22.0 → 0.22.1

## Abweichungen vom Prompt
Keine.

## Offene Punkte
Keine.
