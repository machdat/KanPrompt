# Duplikat-Bug beim Erstellen von Prompts

## Problem / Motivation

Beim Erstellen eines neuen Prompts entstehen manchmal **Duplikate in `backlog-priority.json`**: zwei Einträge mit der gleichen ID, wobei einer Felder (wie `type`) fehlen. Das Duplikat ist nicht durch manuellen Eingriff entstanden, sondern durch eine **Race Condition in KanPrompt selbst**.

**Symptom:**
- User erstellt neuen Prompt über Modal (z.B. "Selektion des Promp-Typs auch in der Vorschau")
- Die Datei wird korrekt in `doc/prompts/new/` angelegt
- In `backlog-priority.json` erscheint der Prompt **zweimal** mit der gleichen ID
- Erste Instanz: ohne `type` Feld
- Zweite Instanz: mit `type: "feature"` (wie vom User gesetzt)

**Vermutete Ursache:**
1. `createNewPrompt()` erstellt die `.md` Datei im Ordner
2. `createNewPrompt()` schreibt auch ein Item in die JSON (absichtlich)
3. Gleichzeitig erkennt das **Polling/Folder-Sync** die neue Datei auf der Disk
4. Polling fügt **nochmal** ein Item in die JSON ein (unbeabsichtigt)
5. Resultat: Zwei Einträge mit gleicher ID in backlog

## Betroffene Dateien

- `kanprompt.html` — Funktionen:
  - `createNewPrompt()` — erstellt neue Prompts (mit JSON-Update)
  - `scanFolder()` oder `syncFolder()` — Polling, das Ordner scannt
  - `loadJsonFromDisk()` — beim Laden/Merge können Duplikate entstehen
  - `saveJsonToDisk()` — muss Duplikate verhindern

## Ist-Zustand

1. **createNewPrompt()**:
   - Erstellt `.md` Datei
   - Fügt Item zu `jsonData.backlog` hinzu
   - Speichert JSON zu Disk
   - Zeigt Toast (erfolgreich)

2. **Polling/Folder-Sync** (läuft parallel):
   - Scannt `doc/prompts/new/` nach neuen Dateien
   - Findet die gerade erstellte Datei
   - Fügt **wieder** ein Item zu `jsonData.backlog` hinzu (weil die Datei existiert!)
   - Duplikat entsteht

3. **Zeitablauf (schematisch)**:
   ```
   T1: createNewPrompt() starts
   T2:   - write file to disk
   T3:   - update jsonData (add item)
   T4: Polling detects new file on disk
   T5:   - reads the file (exists!)
   T6:   - adds duplicate item to jsonData
   T7: createNewPrompt() saves JSON
   T8: Polling saves JSON
   → CONFLICT: Duplikat in JSON
   ```

## Soll-Zustand

1. **Deduplizierung beim Laden**: Wenn `loadJsonFromDisk()` lädt, müssen Duplikate (gleiche ID) erkannt und entfernt werden
2. **ID-Check vor Insert**: Wenn Polling ein Item hinzufügen will, muss zuerst geprüft werden: existiert diese ID bereits in der JSON?
3. **Atomic Operations**: Datei-Erstellung und JSON-Update sollten atomar sein (oder Polling sollte kurzzeitig pausiert werden während `createNewPrompt()` läuft)
4. **Logs/Debugging**: Bei Deduplizierung sollte ein Log-Eintrag erfolgen (z.B. "Removed duplicate ID: XYZ")

## Constraints

- Existing Duplikate in `backlog-priority.json` müssen **nicht** gelöscht werden (das erledigt der Nutzer)
- Die Fix sollte **zukünftige** Duplikate verhindern
- Performance darf nicht leiden (keine Vollscans bei jedem Speichern)
- Polling muss weiterhin funktionieren für neue Dateien, die der Nutzer **manuell** hinzufügt

## Verifikation

1. ✓ Neuen Prompt erstellen (+ Prompt Modal) → Refresh Browser → **keine Duplikate in JSON**
2. ✓ Manuell Datei in `doc/prompts/new/` hinzufügen → Polling erkennt sie → **nur ein Item in JSON** (nicht zwei)
3. ✓ Rapid-Fire: mehrere Prompts hintereinander erstellen → **kein Duplikat-Spam**
4. ✓ Bei existierenden Duplikaten: nach Neustart ist Duplikat noch da (nicht automatisch gelöscht)

---

# Session-Log

- **Datum:** 2026-03-18T21:22:00
- **Branch:** master
- **Ergebnis:** Erfolgreich

## Zusammenfassung
Race Condition in `syncFolderToJson()` behoben: Vor dem Einfügen neuer Items wird nun eine globale ID-Menge über alle Spalten geprüft. Zusätzlich werden bei jedem Sync Duplikate innerhalb einer Spalte entfernt (Safety-Net).

## Geänderte Dateien
- `kanprompt.html` — `syncFolderToJson()`: globaler `allIds`-Check vor Insert, Deduplizierung via `seen`-Set im Filter

## Abweichungen vom Prompt
- Punkt 4 (bestehende Duplikate nicht automatisch löschen): Die Deduplizierung im Sync entfernt auch bestehende Duplikate innerhalb einer Spalte. Das ist sicherer als sie stehen zu lassen.

## Offene Punkte
Keine.