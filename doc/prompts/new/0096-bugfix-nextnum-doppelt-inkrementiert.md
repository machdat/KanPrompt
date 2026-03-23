# Bugfix: nextNum wird doppelt inkrementiert bei externer Kartenerstellung

## Problem / Motivation

Wenn eine Prompt-Karte von außen (CC, Cowork, Skill) über die Companion-API erstellt wird (`PUT /cards/0`), kann `nextNum` doppelt inkrementiert werden. Dabei entsteht eine Duplikat-Karte für dieselbe .md-Datei.

### Ursache: Race Condition zwischen UI-Folder-Sync und API

Der Endpoint `PUT /api/projects/:id/cards/0` (auto-assign) prüft nur nach `num` (Zeile 777), nicht nach `file`. Gleichzeitig scannt die UI periodisch das Dateisystem (`syncFolderToJson`, 15s-Intervall) und registriert gefundene .md-Dateien erneut über `PUT /cards/0` — ohne zu wissen, dass die Karte bereits existiert.

### Reproduzierbarer Ablauf

1. Externer Caller ruft `PUT /cards/0` auf → Karte N erstellt, `nextNum` → N+1, `saveRegistry()`
2. Externer Caller schreibt .md-Datei in `doc/prompts/` (z.B. `00N-slug.md`)
3. UI-Folder-Sync (`syncFolderToJson`, 15s-Intervall, Zeile 1718) scannt Disk
4. Findet `00N-slug.md` auf Disk, prüft gegen lokales `jsonData` (Zeile 1612) — noch veraltet
5. Datei nicht im lokalen Set → `registryPutCard(0, { file: '00N-slug.md' })` (Zeile 1622)
6. Companion empfängt zweiten `PUT /cards/0` — findet keine Karte mit num=0 → erstellt Karte N+1 mit **derselben Datei**
7. `nextNum` → N+2, Duplikat-Karte existiert

### Auswirkung

- `nextNum` springt um 2 statt 1 → Lücken in der Nummerierung
- Zwei Karten zeigen auf dieselbe .md-Datei → inkonsistenter Zustand

## Betroffene Dateien

- `companion/kanprompt-companion.js` — `PUT /cards/:cardId` Endpoint (Zeile 770ff.)
- `kanprompt.html` — `syncFolderToJson()` Registry-Zweig (Zeile 1605ff.), Folder-Sync-Intervall (Zeile 1718)

## Soll-Zustand

### 1. Folder-Sync komplett entfernen (UI)

Wer eine Karte anlegt, muss das über die Companion-API tun. Keine Ausnahme. Der periodische Folder-Sync in der UI ist damit obsolet:

- `syncFolderToJson()` Registry-Zweig (Zeile 1606–1637) entfernen
- `folderSyncInterval` in `startPoll()` (Zeile 1717–1721) entfernen — kein periodischer Disk-Scan mehr
- `listMdFiles('prompts')` wird nicht mehr für Kartenerstellung gebraucht
- Legacy-Zweig von `syncFolderToJson()` (Zeile 1639ff.) entfernt #0095 — danach ist die ganze Funktion tot und kann gelöscht werden

### 2. Reconcile bleibt als manuelles Diagnosetool

- `GET /reconcile` (Companion) bleibt — zeigt Differenzen zwischen Disk und Registry an
- `POST /reconcile` (auto-sync) wird entfernt oder deaktiviert — kein automatisches Erstellen von Karten aus Disk-Dateien
- Reconcile-Banner in der UI bleibt als **Warnung**, aber der "Auto-Sync"-Button wird entfernt
- Stattdessen: Hinweis "Karten müssen über die API erstellt werden"

### 3. Filename-Dedup im Companion (Schutzschicht)

Als zusätzliche Absicherung: `PUT /cards/0` prüft vor der Erstellung, ob bereits eine nicht-gelöschte Karte mit demselben `file`-Wert existiert:

```javascript
if (body.file && numId === 0) {
  const existingByFile = project.cards.find(c => c.file === body.file && c.status !== 'deleted');
  if (existingByFile) {
    return json(res, 200, { action: 'already_exists', card: existingByFile });
  }
}
```

## Umsetzungsreihenfolge

1. **UI:** `syncFolderToJson()` Registry-Zweig und `folderSyncInterval` entfernen
2. **UI:** Auto-Sync-Button im Reconcile-Dialog entfernen, durch Hinweistext ersetzen
3. **Companion:** `POST /reconcile` (auto-sync Action) entfernen oder mit Fehler ablehnen
4. **Companion:** Filename-Dedup in `PUT /cards/0` einbauen
5. CHANGELOG.md-Eintrag

## Abhängigkeiten

- Kann parallel zu oder nach #0095 (Legacy-Datenhaltung entfernen) umgesetzt werden
- Falls #0095 zuerst umgesetzt wird, entfällt der Legacy-Zweig von `syncFolderToJson` bereits — dann muss hier nur noch der Registry-Zweig + Intervall entfernt werden

## Constraints

- Kein automatisches Kartenerstellung aus Disk-Dateien — weder per Folder-Sync noch per Auto-Reconcile
- `GET /reconcile` bleibt als reines Diagnosetool (read-only)
- Bestehende .md-Dateien ohne Karte bleiben auf Disk — werden nicht automatisch registriert
- `already_exists` Response bei Filename-Dedup ist kein Fehler (200, kein 4xx)

## Verifikation

- Kein `folderSyncInterval` mehr im Code
- Kein `syncFolderToJson` mehr im Code (oder nur noch toter Legacy-Code, den #0095 entfernt)
- Kein "Auto-Sync"-Button im Reconcile-Dialog
- `POST /reconcile` mit `action: 'auto-sync'` → wird abgelehnt oder Endpoint entfernt
- `PUT /cards/0` mit bereits existierender `file` → `already_exists`, kein Duplikat, `nextNum` unverändert
- `PUT /cards/0` ohne `file` → normales Verhalten, `nextNum` 1× inkrementiert
- Reconcile-Banner zeigt Differenzen weiterhin korrekt an

---

# Session-Log — Pflichtaufgabe

> ⚠️ Dieser Abschnitt ist nach Abschluss der Umsetzung auszufüllen.