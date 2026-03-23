# Bugfix: projectPath in Registry zeigt auf alten Pfad nach Repo-Umzug

## Problem / Motivation

Nach dem Verschieben des KanPrompt-Repos (vgl. #0093) zeigt `projectPath` in der Projects Registry noch auf den alten Pfad `C:\git\local\KanPrompt`. Das Repo liegt aber unter `C:\Users\christian.mangold\git\KanPrompt`.

### Auswirkung

- **Dispatch:** Projekt wird als "Pfad existiert nicht" angezeigt, kein Prompt-Auswahl möglich, Git-Status nicht verfügbar
- **Companion:** `loadFromRegistry()` kann Prompt-Dateien nicht finden → in kanprompt.html fällt das Board still auf den Legacy-Modus zurück (bis #0095 das behebt)
- **Reconcile:** Disk-Scan schlägt fehl, weil das Verzeichnis nicht existiert

### Konkreter Zustand

Registry (`companion/projects-registry.json`):
```json
"KanPrompt": {
  "projectPath": "C:\\git\\local\\KanPrompt",   // ← veraltet
  ...
}
```

Tatsächlicher Pfad: `C:\Users\christian.mangold\git\KanPrompt`

## Betroffene Dateien

- `companion/projects-registry.json` — falscher `projectPath`
- `companion/kanprompt-companion.js` — fehlende Validierung bei Startup und API-Zugriff

## Soll-Zustand

### 1. Sofortfix: projectPath korrigieren

Den `projectPath` für das KanPrompt-Projekt in der Registry auf den korrekten Pfad setzen:

```
PUT /api/projects/KanPrompt
{ "projectPath": "C:\\Users\\christian.mangold\\git\\KanPrompt" }
```

### 2. Prävention: Pfad-Validierung im Companion

Beim Companion-Start und bei `GET /api/projects` für jedes Projekt prüfen, ob `projectPath` existiert. Falls nicht:

- Projekt in der API-Antwort als `pathValid: false` markieren
- In der Companion-Konsole eine Warnung loggen: `⚠ KanPrompt: projectPath existiert nicht: C:\git\local\KanPrompt`
- Kein stilles Weiterarbeiten mit ungültigem Pfad

### 3. Optional: Pfad-Update über API ermöglichen

Falls noch nicht vorhanden: `PUT /api/projects/:id` sollte `projectPath` aktualisieren können, damit Dispatch oder die UI den Pfad korrigieren kann, ohne die Registry-Datei manuell zu editieren.

## Umsetzungsreihenfolge

1. **Sofortfix:** `projectPath` per API-Call korrigieren
2. **Companion:** Pfad-Validierung bei Startup + `pathValid`-Flag in API-Response
3. **Dispatch:** Projekte mit `pathValid: false` visuell kennzeichnen (nicht nur "Pfad existiert nicht" im Dropdown)
4. CHANGELOG.md-Eintrag

## Constraints

- Der Sofortfix ist ein reiner Daten-Fix (kein Code nötig)
- Die Pfad-Validierung darf den Startup nicht blockieren (nur warnen)
- Projekte mit ungültigem Pfad bleiben in der Registry (werden nicht gelöscht)

## Verifikation

- `projectPath` für KanPrompt zeigt auf existierenden Pfad
- Dispatch zeigt KanPrompt ohne Fehlermeldung im Dropdown
- Companion loggt Warnung für Projekte mit ungültigem Pfad
- `GET /api/projects` enthält `pathValid`-Flag pro Projekt
- Git-Status in Dispatch ist wieder verfügbar

---

# Session-Log — Pflichtaufgabe
<!-- status: done -->

> ⚠️ Dieser Abschnitt ist nach Abschluss der Umsetzung auszufüllen.