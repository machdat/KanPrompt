# Selektion des Prompt-Typs auch in der Vorschau

## Problem / Motivation

Aktuell ist der Prompt-Typ (`bugfix`, `feature`, `release`) nur im `backlog-priority.json` gespeichert und nicht in der UI sichtbar/editierbar. Wenn der Nutzer eine Karte in der Vorschau hat, kann er den Typ nicht schnell ändern — er müsste das JSON direkt editieren oder den Editor öffnen. Eine intuitive UI im Preview-Panel würde den Workflow beschleunigen und die Typ-Selektion sichtbarer machen.

## Betroffene Dateien

- `kanprompt.html` — Preview-Panel Header (`#previewMeta`), neue Radio-Button-Gruppe für Typ-Selektion, JavaScript-Logik für Typ-Änderung
- `doc/prompts/backlog-priority.json` — Existierendes `type` field wird aktualisiert bei Typ-Wechsel

## Ist-Zustand

1. **JSON**: `backlog-priority.json` speichert optional `type` als String (`"bugfix"` | `"feature"` | `"release"`)
2. **Preview**: `#previewMeta` zeigt nur `file`, `new`/`inProgress`/`done` Timestamps
3. **UI**: Keine Möglichkeit, den Typ in der Vorschau zu ändern (read-only)
4. **Farbcodierung**: Momentan keine visuelle Typ-Unterscheidung im Backlog selbst

## Soll-Zustand

1. **Preview-Header erweitern**: `#previewMeta` mit neuer Zeile für Typ-Selektion
2. **Radio-Button-Gruppe** in `#previewMeta` mit drei Optionen:
   - ⚙️ `bugfix` (orange Badge/Farbe)
   - ✨ `feature` (blue Badge/Farbe)
   - 🚀 `release` (green Badge/Farbe)
3. **Interaktiv**: Beim Klick auf einen Radio-Button:
   - Typ in `jsonData` aktualisieren (`.find()` nach selectedId in backlog/inProgress/done)
   - `backlog-priority.json` speichern via `saveJsonToDisk()`
   - Toast zeigen: "Typ → feature"
   - UI visuell aktualisieren (z.B. Badge im `#previewMeta` neu rendern)
4. **UI Design**: 
   - Kompakte Radio-Button-Gruppe (inline im `#previewMeta`)
   - Aktiver Button visuell hervorgehoben (z.B. `font-weight: 600` oder Border)
   - Keine Änderung der `.modal-actions` Buttons oben
5. **State-Handling**: 
   - Wenn `selectedItem` keinen `type` hat → standardmäßig `"bugfix"` anzeigen
   - Wenn Item in anderen Spalten ist (`inProgress`, `done`) → Typ bleibt editierbar

## Constraints

- Das `#previewMeta` Layout darf nicht verbrochen werden (nur neue Zeile hinzufügen)
- `#previewEditor` (Edit-Mode für Dateiinhalt) ist unabhängig — Typ-Selektion ist orthogonal
- Der Typ wird **nicht** in die Markdown-Datei geschrieben (nur JSON)
- Typ-Änderung darf nicht die Dateiänderungen in den `.md` Dateien triggern
- Undo/Redo nicht nötig — einfacher directer Save

## Verifikation

1. ✓ Karte öffnen (z.B. in Backlog) → Preview zeigt Radio-Buttons mit aktuellem Typ
2. ✓ Radio-Button klicken → `backlog-priority.json` speichert neuen Typ
3. ✓ Toast bestätigt Änderung
4. ✓ Preview-UI aktualisiert sich sofort (Badge-Farbe)
5. ✓ Reload: Typ bleibt erhalten
6. ✓ Karte ohne `type` → wird auf `"bugfix"` gesetzt (Default)
7. ✓ In Edit-Mode ist Typ-Selektion auch sichtbar/editierbar

---

# Session-Log

- **Datum:** 2026-03-18T21:28:00
- **Branch:** master
- **Ergebnis:** Erfolgreich

## Zusammenfassung
Typ-Selektion direkt im Preview-Panel: Die statische Typ-Anzeige wurde durch klickbare Buttons (bugfix/feature/release) ersetzt. Klick ändert den Typ sofort in der JSON und aktualisiert Board + Info-Bar. Nutzt die bestehenden `.type-option`-CSS-Klassen.

## Geänderte Dateien
- `kanprompt.html` — `openPreview()`: Typ-Selector als klickbare Buttons im Meta-Bereich, neue `changeItemType()`-Funktion

## Abweichungen vom Prompt
- Keine Radio-Buttons im klassischen Sinne, sondern die bestehenden `.type-option`-Buttons (konsistent mit dem Erstellungs-Modal)

## Offene Punkte
Keine.
