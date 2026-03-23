# Reconciliation bei Projektaktivierung

## Problem / Motivation

Prompt-Karten (Markdown-Dateien in `doc/prompts/`) können außerhalb von KanPrompt verändert werden — z.B. durch Claude Code, manuelle Git-Operationen, oder direkte Dateibearbeitung. Die Projects Registry im Companion ist dann nicht mehr synchron mit dem tatsächlichen Dateibestand auf der Festplatte.

Aktuell gibt es keinen systematischen Abgleich beim Öffnen eines Projekts. Differenzen fallen erst zufällig auf oder führen zu stillen Fehlern (z.B. Registry kennt eine Karte, deren Datei nicht mehr existiert).

Ziel: Beim Aktivieren eines Projekts vergleicht der Companion seinen Registry-Stand mit den real vorhandenen Dateien und informiert den Benutzer über Differenzen.

## Betroffene Dateien

- `companion/kanprompt-companion.js` — Neuer Endpunkt für Reconciliation-Check; Logik für Disk-Scan vs. Registry-Abgleich
- `kanprompt.html` — Differenz-Dialog beim Projektöffnen; Aktionen für den Benutzer

## Ist-Zustand

- Beim Öffnen eines Projekts lädt KanPrompt die Karten aus der Registry (`GET /api/projects/:id`)
- Es gibt keinen Abgleich mit dem Dateisystem
- Neue Dateien auf Disk, die nicht in der Registry stehen, werden ignoriert
- Registry-Einträge, deren Dateien gelöscht wurden, bleiben als Geister-Karten bestehen
- Umbenannte Dateien erscheinen als neue Datei + fehlende alte Datei

## Soll-Zustand

### 1. Reconciliation-Endpunkt im Companion

Neuer Endpunkt:
```
GET /api/projects/:id/reconcile
Response: {
  "inSync": false,
  "onDiskOnly": [
    { "file": "fix-new-bug.md", "title": "Fix New Bug" }
  ],
  "inRegistryOnly": [
    { "id": "old-card", "file": "old-card.md", "title": "Old Card", "status": "new" }
  ]
}
```

**Ablauf:**
1. Companion liest alle `.md`-Dateien aus dem `promptsDir` des Projekts (rekursiv, ohne Unterordner-Semantik)
2. Vergleicht die Dateinamen mit den `file`-Feldern der Karten in der Registry
3. Liefert zwei Listen: `onDiskOnly` (Dateien ohne Registry-Eintrag) und `inRegistryOnly` (Registry-Einträge ohne Datei)
4. `inSync: true` wenn beide Listen leer sind

### 2. Automatischer Check beim Projektöffnen

Nach dem Laden der Projektdaten ruft KanPrompt `/api/projects/:id/reconcile` auf. Wenn `inSync: true` → nichts tun. Wenn `inSync: false` → Differenz-Dialog anzeigen.

### 3. Differenz-Dialog

Der Dialog zeigt die Differenzen übersichtlich:

**Dateien nur auf Disk** (nicht in Registry):
- Jede Datei als Zeile mit Dateiname und (falls aus YAML-Frontmatter/erster Zeile extrahierbar) Titel
- Diese Dateien wurden vermutlich extern erstellt (z.B. durch CC)

**Karten nur in Registry** (Datei fehlt):
- Jede Karte als Zeile mit ID, Titel, Status
- Diese Dateien wurden vermutlich extern gelöscht oder umbenannt

**Aktionen für den Benutzer:**
- **a) Auto-Sync** — Companion mit dem realen Dateibestand synchronisieren:
  - `onDiskOnly`: Neue Karten in der Registry anlegen (Status: `new`, nächste freie Nummer)
  - `inRegistryOnly`: Karten aus der Registry entfernen (oder in `deleted` verschieben)
- **b) Manuell klären** — Dialog schließen, Benutzer kümmert sich selbst (z.B. fehlende Dateien wiederherstellen, Umbenennungen korrigieren)

### 4. Auto-Sync-Endpunkt

```
POST /api/projects/:id/reconcile
Body: { "action": "auto-sync" }
Response: {
  "added": [ { "id": "fix-new-bug", "file": "fix-new-bug.md", "num": 73 } ],
  "removed": [ { "id": "old-card" } ]
}
```

## Constraints

- **Reconciliation ist nicht-destruktiv by default**: Der GET-Check verändert nichts. Nur der explizite POST mit Benutzer-Bestätigung führt zu Änderungen.
- **Keine Inhaltsvergleiche**: Verglichen werden nur Dateinamen (Existenz), nicht Dateiinhalte. Inhaltliche Divergenz ist kein Thema dieses Features.
- **README.md ausschließen**: Die Datei `doc/prompts/README.md` ist keine Prompt-Karte und muss vom Scan ausgenommen werden.
- **Kein Blocking**: Der Reconciliation-Dialog blockiert die Nutzung nicht zwingend — der Benutzer kann ihn schließen und später erneut aufrufen. Aber die Differenz sollte sichtbar bleiben (z.B. dezenter Hinweis im Header).
- CHANGELOG.md-Eintrag erforderlich.
- Setzt voraus, dass Karte #72 (Companion-Pflicht) bereits umgesetzt ist.

## Verifikation

- [ ] Projekt öffnen, alle Dateien synchron → kein Dialog, Board lädt normal
- [ ] Neue `.md`-Datei manuell in `doc/prompts/` anlegen → Dialog zeigt "Datei nur auf Disk"
- [ ] Datei einer bestehenden Karte löschen → Dialog zeigt "Karte nur in Registry"
- [ ] Auto-Sync: Neue Datei auf Disk → Karte erscheint im Backlog
- [ ] Auto-Sync: Fehlende Datei → Karte wird aus Registry entfernt/gelöscht
- [ ] "Manuell klären" → Dialog schließt, Board lädt mit bekannten Karten
- [ ] `README.md` wird nicht als fehlende Karte gemeldet
- [ ] `GET /api/projects/:id/reconcile` bei synchronem Projekt → `{ "inSync": true, ... }`

---

# Session-Log

- **Datum:** 2026-03-22T15:30:00
- **Branch:** feature/0073-reconciliation-bei-projektaktivierung
- **Ergebnis:** Erfolgreich

## Zusammenfassung
Reconciliation-Feature implementiert: Beim Projektöffnen vergleicht der Companion den Registry-Stand mit den echten Dateien auf Disk und zeigt Differenzen in einem Dialog an. Auto-Sync synchronisiert mit einem Klick.

## Geänderte Dateien
- `companion/kanprompt-companion.js` — GET + POST `/api/projects/:id/reconcile` Endpunkte, Version 1.6.0, /info-Liste aktualisiert
- `kanprompt.html` — Reconciliation-Dialog (HTML + CSS + JS), Banner im Header, checkReconciliation() beim Projektöffnen, Version 0.25.0
- `CHANGELOG.md` — Eintrag für v1.6.0

## Abweichungen vom Prompt
Keine.

## Offene Punkte
Keine.
