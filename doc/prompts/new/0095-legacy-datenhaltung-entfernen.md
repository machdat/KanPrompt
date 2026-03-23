# Legacy-Datenhaltung aus kanprompt.html entfernen — Companion als einzige Datenquelle

## Problem / Motivation

Nach der Registry-Migration (#0069) und der Companion-Pflicht (#0081) existiert in `kanprompt.html` noch der vollständige Legacy-Modus (~50 `if (registryMode)` / `else`-Verzweigungen). Dieser Code ist nicht nur tot — er wird still aktiviert, wenn `loadFromRegistry()` fehlschlägt (Zeile 1408–1414 → Fallback Zeile 1416ff.).

Konkretes Beispiel: Ein falscher `projectPath` in der Registry führte dazu, dass `loadFromRegistry()` scheiterte, der Legacy-Modus aktiv wurde und KanPrompt die lokale `backlog-priority.json` als Datenquelle nutzte — ohne jede Warnung. Das Ergebnis: divergierende Datenquellen, Git-Status in der Dispatch-Seite "nicht verfügbar".

Doppelte Datenhaltung ist architektonisch nicht tragbar. Der kurzfristige Gewinn ("funktioniert auch ohne Companion") erzeugt langfristig schwer diagnostizierbare Inkonsistenzen.

## Betroffene Dateien

- `kanprompt.html` — Legacy-Codepfade entfernen, Fehlerfall explizit blockieren statt still fallbacken

## Ist-Zustand

### Duale Codepfade (Registry vs. Legacy)

- `let registryMode = false;` (Zeile 750) — globaler Schalter, der bei jedem Projektöffnen auf `false` zurückgesetzt wird (Zeile 1345)
- ~50 Stellen mit `if (registryMode) { ... } else { /* Legacy */ }` Pattern
- Zeile 1416: `// Fallback: Legacy mode with backlog-priority.json (only if registry load fails)` — stiller Fallback ohne Blockade

### Legacy-Funktionen (nicht mehr benötigt)

- `loadJson()` (Zeile 1472) — liest `backlog-priority.json` via File System Access API
- `writeJson()` (Zeile 1478) — schreibt `backlog-priority.json` via File System Access API
- `moveFile()` — verschiebt Dateien zwischen Unterordnern (`new/`, `in-progress/`, `done/`, `deleted/`)
- `syncFolderToJson()` Legacy-Zweig — synchronisiert Ordnerstruktur mit lokaler JSON
- Recovery-Logik für `.backlog-priority.json.tmp` (Zeile 1418–1426)
- Erstellung von `backlog-priority.json` falls nicht vorhanden (Zeile 1428–1440)

### Stiller Fallback-Pfad

```
openProject()
  → registryMode = false (Zeile 1345)
  → Companion-Pflicht-Check (Zeile 1387) — blockiert nur wenn Companion komplett unerreichbar
  → loadFromRegistry() (Zeile 1408) — kann fehlschlagen bei: falschem Pfad, unbekanntem Projekt, Netzwerkfehler
  → Fallback auf Legacy-Modus (Zeile 1416) — KEINE Blockade, KEINE Warnung
```

## Soll-Zustand

### 1. Stiller Fallback wird zur expliziten Blockade

Wenn `loadFromRegistry()` fehlschlägt, wird nicht in den Legacy-Modus gewechselt. Stattdessen:
- Blockade-UI anzeigen (analog zur Companion-Blockade) mit konkreter Fehlermeldung
- z.B. "Projekt konnte nicht aus der Registry geladen werden. Ist das Projekt im Companion registriert?"
- Retry-Button anbieten

### 2. registryMode-Variable entfernen

- Die Variable `registryMode` und alle Abfragen darauf entfernen
- Der Registry-Pfad wird zum einzigen Pfad
- Funktionen, die nur im Registry-Modus aufgerufen wurden, verlieren ihre if-Hülle

### 3. Legacy-Funktionen entfernen

Komplett entfernen:
- `loadJson()` — wird durch `loadFromRegistry()` ersetzt
- `writeJson()` — Companion-API übernimmt alle Schreibvorgänge
- `moveFile()` — Dateien werden nicht mehr zwischen Ordnern verschoben
- Legacy-Zweige in `syncFolderToJson()` — nur der Registry-Zweig bleibt
- Legacy-Zweige in `handleDrop()` — nur der Registry-Zweig bleibt
- Legacy-Zweige in `deleteItem()`, `restoreItem()`, `savePreview()`, `addNewCard()` etc.
- Recovery-Logik für `.backlog-priority.json.tmp`
- Erstellung/Lesen von `backlog-priority.json`
- Alle `jsonHandle`-Referenzen (File System Access Handle für die JSON-Datei)

### 4. Polling vereinfachen

- Legacy-Polling (Zeile 1723ff.) entfernen — nur noch Registry-Polling behalten
- `syncFolderToJson()` Legacy-Zweig entfernen

### 5. UI-Bereinigung

- Ordner-Hints in Karten entfernen (`folder-hint` Klasse, `new/`, `in-progress/` Anzeigen)
- `registryMode ? '' : 'deleted/'` Pattern entfernen
- `registryMode ? ' ⚡' : ''` im Folder-Label (Zeile 1778) — das ⚡ wird zum Standard oder entfällt

## Constraints

- **Kein Legacy-Fallback:** Wenn die Registry nicht erreichbar oder das Projekt nicht registriert ist, wird blockiert — nicht fallbacken.
- `backlog-priority.json` wird weder gelesen noch geschrieben. Bestehende Dateien in Projekten bleiben unangetastet (können manuell gelöscht werden).
- Unterordner (`new/`, `in-progress/`, `done/`, `deleted/`) werden nicht mehr aktiv genutzt. Bestehende `.gitkeep`-Dateien stören nicht.
- **File System Access API bleibt** — wird weiterhin für `.md`-Dateiinhalte gebraucht (Lesen/Schreiben von Prompt-Texten).
- CHANGELOG.md-Eintrag erforderlich.
- Version-Bump in `kanprompt.html`.

## Umsetzungsreihenfolge

1. Fallback-Pfad (Zeile 1416ff.) durch Blockade-UI mit Fehlermeldung ersetzen
2. `registryMode`-Variable und alle `if/else`-Verzweigungen entfernen (Registry-Zweig behalten)
3. `loadJson()`, `writeJson()`, `moveFile()` und Legacy-Hilfsfunktionen löschen
4. `jsonHandle`-Variable und alle Referenzen entfernen
5. Legacy-Polling und `syncFolderToJson()`-Legacy-Zweig entfernen
6. UI-Bereinigung (Ordner-Hints, ⚡-Marker)
7. Toter Code: Suche nach verwaisten Funktionen/Variablen

## Verifikation

- Companion läuft, Projekt registriert → Board lädt normal
- Companion läuft, Projekt NICHT registriert → Blockade-UI mit Fehlermeldung
- Companion nicht erreichbar → Blockade-UI (bestehende Companion-Pflicht)
- `loadFromRegistry()` schlägt fehl → Blockade-UI, KEIN stiller Legacy-Fallback
- Kein `registryMode` mehr im Code
- Kein `loadJson()`, `writeJson()`, `moveFile()` mehr im Code
- Kein `jsonHandle` mehr im Code
- Keine `backlog-priority.json`-Lese/Schreibzugriffe
- `.md`-Dateien werden weiterhin korrekt gelesen/geschrieben (File System Access API)
- Drag & Drop funktioniert (nur Registry-API)
- Neue Karte erstellen funktioniert
- Karte löschen/wiederherstellen funktioniert
- CHANGELOG.md enthält Eintrag

---

# Session-Log — Pflichtaufgabe

> ⚠️ Dieser Abschnitt ist nach Abschluss der Umsetzung auszufüllen.