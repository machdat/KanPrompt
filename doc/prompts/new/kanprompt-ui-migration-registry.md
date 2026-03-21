# KanPrompt UI Migration: Registry statt Ordner/Backlog-JSON

## Problem / Motivation

Nach Einführung der Projects Registry (#63) existieren zwei Wahrheitsquellen: die Registry und das bisherige System aus `backlog-priority.json` + Ordnerstruktur (`new/`, `in-progress/`, `done/`, `deleted/`). Die UI muss auf die Registry umgestellt werden, damit eine einzige Source of Truth gilt.

## Betroffene Dateien

- `kanprompt.html` — Komplette Umstellung der Datenlade- und Schreiblogik
- `companion/kanprompt-companion.js` — Bestehende Backlog-Endpunkte durch Registry-Endpunkte ablösen (oder Proxy-Endpunkte einrichten)

## Ist-Zustand

- UI liest `backlog-priority.json` beim Laden und schreibt es bei jeder Änderung zurück
- Kartenstatus wird durch physische Ordner (`new/`, `in-progress/`, `done/`, `deleted/`) abgebildet
- Drag & Drop verschiebt Dateien zwischen Ordnern
- Karten-Reihenfolge in der Backlog-Spalte kommt aus der Array-Reihenfolge in `backlog-priority.json`

## Soll-Zustand

### 1. Datenquelle umstellen

- Beim Laden: `GET /api/projects/:id` statt `backlog-priority.json` lesen
- Karten-Liste kommt aus `cards[]` der Registry
- Spalten-Zuordnung basiert auf `card.status` statt auf Ordnerzugehörigkeit
- Reihenfolge innerhalb einer Spalte basiert auf `cardPriority[]`

### 2. Statusänderungen

- Drag & Drop zwischen Spalten: `PATCH /api/projects/:id/cards/:cardId/status` aufrufen
- Kein Dateiverschieben mehr — die Markdown-Datei bleibt physisch in `doc/prompts/`
- Der Status wird denormalisiert in die Karte geschrieben (erledigt der Registry-Endpoint aus #63)

### 3. Alle Karten in einem Ordner

- Unterordner `new/`, `in-progress/`, `done/`, `deleted/` werden nicht mehr benötigt
- Bestehende Karten müssen einmalig in `doc/prompts/` zusammengeführt werden
- Migration: Companion-Startup oder manuelles Script verschiebt alle Karten in das Hauptverzeichnis und importiert ihre Metadaten in die Registry

### 4. Karten-Erstellung

- "Neue Karte" erstellt die Markdown-Datei in `doc/prompts/` (kein Unterordner)
- Registriert die Karte via `PUT /api/projects/:id/cards/:cardId`
- Nummer wird aus `nextNum` in der Registry bezogen und inkrementiert

### 5. Karten-Reihenfolge

- Drag & Drop innerhalb einer Spalte: `PUT /api/projects/:id/card-priority` mit neuem Array
- Reihenfolge gilt spaltenübergreifend (ein Array für alle Karten, gefiltert nach Status in der UI)

### 6. Abwärtskompatibilität & Migration

- Beim ersten Start ohne Registry-Daten: Companion liest `backlog-priority.json`, importiert alle Einträge in die Registry, verschiebt Dateien aus Unterordnern
- `backlog-priority.json` wird danach nicht mehr geschrieben
- Bestehende `.gitkeep`-Dateien in Unterordnern können bleiben (stören nicht)

### 7. Dispatch-Integration

- Dispatch Manager liest Worktree-Daten aus der Registry statt sie selbst zu verwalten
- Status-Updates vom Dispatcher gehen über die Registry-API
- `resumeChatId`, `runtime`, `cost` werden via `PUT /api/projects/:id/worktrees/:branch` aktualisiert

## Constraints

- Migration muss idempotent sein (mehrfach ausführbar ohne Datenverlust)
- Während der Migration darf kein Datenverlust auftreten — im Zweifel beide Quellen parallel lesen
- Bestehende Karten-Nummern (`num`) bleiben erhalten
- Karten, die bereits in `done/` oder `deleted/` liegen, behalten ihren Status
- CHANGELOG.md-Eintrag erforderlich
- Setzt #63 (Projects Registry) vollständig voraus

## Verifikation

1. [ ] KanPrompt öffnen → Spalten zeigen Karten basierend auf Registry-Status (nicht Ordner)
2. [ ] Drag & Drop zwischen Spalten → `PATCH status` wird aufgerufen, Datei bleibt an Ort und Stelle
3. [ ] Neue Karte erstellen → Datei in `doc/prompts/`, Eintrag in Registry, korrekte Nummer
4. [ ] Reihenfolge ändern → `cardPriority` wird aktualisiert, bleibt nach Reload erhalten
5. [ ] Erstes Laden mit bestehender `backlog-priority.json` → automatische Migration in Registry
6. [ ] Nach Migration: alle Karten-Dateien in `doc/prompts/` (keine Unterordner mehr nötig)
7. [ ] Dispatch-Zeile zeigt Worktree-Status aus der Registry
8. [ ] `backlog-priority.json` wird nach Migration nicht mehr geschrieben

---

# Session-Log — Pflichtaufgabe nach Abschluss
