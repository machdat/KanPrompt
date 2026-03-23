# Dispatch: Add-Form Verbesserungen (Letztes Projekt, Prompt-Sperre, Prioritätssortierung)

## Problem / Motivation

Beim Hinzufügen eines neuen Auftrags im Dispatch muss der User jedes Mal das Projekt manuell aus dem Dropdown wählen — auch wenn er wiederholt am selben Projekt arbeitet. Das ist unnötige Reibung im Workflow, besonders wenn man mehrere Prompts nacheinander dispatcht.

Zusätzlich ist die Prompt-Auswahl nicht korrekt gesperrt: Öffnet man das Add-Formular erneut, bleiben die Prompt-Einträge aus der vorherigen Session sichtbar und wählbar, auch ohne Projekt gewählt zu haben. Der "Hinzufügen"-Button ist ebenfalls immer aktiv, statt erst bei vollständiger Auswahl.

Die Prompts im Dropdown sollen außerdem in derselben Prioritätsreihenfolge erscheinen wie in der KanPrompt-Kanban-Ansicht.

## Betroffene Dateien

- `dispatch.html` — Add-Form-Logik: `populateProjectDropdown()`, `onProjectChange()`, `addItem()`, `toggleAddForm()`

## Ist-Zustand

1. **Projekt-Dropdown**: Beim Öffnen des Add-Formulars (`toggleAddForm()` → `populateProjectDropdown()`) wird immer "— Projekt wählen —" angezeigt, ohne Erinnerung an die letzte Auswahl.
2. **Prompt-Sperre**: Das `<select id="addPrompt">` startet initial mit `disabled`, aber `populateProjectDropdown()` setzt den Prompt-Dropdown NICHT zurück. Folge: Öffnet man das Formular erneut nach einer vorherigen Auswahl, ist der Prompt-Dropdown noch befüllt und aktiv — auch ohne Projekt. Außerdem ist der "Hinzufügen"-Button immer klickbar (Validierung nur per Toast in `addItem()`).
3. **Prioritätssortierung**: Der Server-Endpoint `/project-backlog` sortiert die Backlog-Items nach `cardPriority`. Muss verifiziert werden, dass die Reihenfolge im Dropdown korrekt ankommt.

## Soll-Zustand

### 1. Letztes Projekt vorauswählen

**localStorage-Key**: `kanprompt_dispatch_last_project`

**Speichern**: In `onProjectChange()` — wenn ein gültiger `projectPath` gewählt wird, diesen in localStorage speichern.

**Wiederherstellen**: In `populateProjectDropdown()` — nach dem Aufbau des Dropdowns:
1. Letzten `projectPath` aus localStorage lesen
2. Falls vorhanden und im Dropdown enthalten: `select.value = lastPath` setzen
3. Automatisch `onProjectChange()` aufrufen, damit die Prompt-Liste sofort geladen wird

**Ablauf beim User:**
1. User klickt "+ Auftrag hinzufügen"
2. Dropdown zeigt sofort das zuletzt gewählte Projekt (statt "— Projekt wählen —")
3. Prompt-Dropdown wird sofort mit den Backlog-Einträgen des Projekts befüllt
4. User wählt nur noch den Prompt → Hinzufügen

### 2. Prompt-Auswahl und Button korrekt sperren

**Prompt-Dropdown Reset**: In `populateProjectDropdown()` — VOR dem Laden der Projekte:
```javascript
const promptSelect = document.getElementById('addPrompt');
promptSelect.innerHTML = '<option value="">— zuerst Projekt wählen —</option>';
promptSelect.disabled = true;
```

**"Hinzufügen"-Button**: Der Button soll `disabled` sein, solange nicht sowohl Projekt als auch Prompt gewählt sind:
- Initial: `disabled`
- Aktivieren: Wenn `addProject.value` UND `addPrompt.value` beide gesetzt sind
- Deaktivieren: Wenn eines der beiden leer wird
- Umsetzung: `onProjectChange()` und ein neuer `onPromptChange()`-Handler auf dem Prompt-Select müssen den Button-Status aktualisieren

**HTML-Änderung**: 
```html
<button class="btn btn-sm btn-primary" onclick="addItem()" id="addBtn" disabled>Hinzufügen</button>
<select id="addPrompt" disabled onchange="onPromptChange()">
```

**Neue Funktion `onPromptChange()`**:
```javascript
function onPromptChange() {
  const hasProject = !!document.getElementById('addProject').value;
  const hasPrompt = !!document.getElementById('addPrompt').value;
  document.getElementById('addBtn').disabled = !(hasProject && hasPrompt);
}
```

Am Ende von `onProjectChange()` ebenfalls `onPromptChange()` aufrufen (oder den Button-Status direkt setzen).

### 3. Prompts nach Priorität sortiert

Sicherstellen, dass:
- `/project-backlog` die Items nach `cardPriority` sortiert zurückgibt (Registry-Pfad)
- `onProjectChange()` die Reihenfolge aus `result.backlog` beibehält (kein nachträgliches Sortieren nach Name o.ä.)
- Die Dropdown-Reihenfolge identisch ist mit der Backlog-Spalte in der KanPrompt-Kanban-Ansicht

## Constraints

- Nur `dispatch.html` ändern — keine Server-Änderung nötig
- localStorage-Key: `kanprompt_dispatch_last_project` (konsistent mit bestehendem `kanprompt_dispatch_queue`)
- Kein CHANGELOG-Eintrag nötig (Minor-UX-Verbesserung)
- Falls das gespeicherte Projekt nicht mehr in der Projektliste existiert: graceful Fallback auf "— Projekt wählen —"
- Bestehende `addItem()`-Validierung per Toast kann als Fallback bleiben, aber der Button-disabled-State ist die primäre Absicherung

## Verifikation

1. [ ] Projekt wählen → Prompt hinzufügen → Form erneut öffnen → dasselbe Projekt ist vorausgewählt
2. [ ] Vorausgewähltes Projekt → Prompt-Dropdown ist sofort befüllt (kein manueller Klick nötig)
3. [ ] Gespeichertes Projekt existiert nicht mehr → Fallback auf "— Projekt wählen —", Prompt bleibt `disabled`
4. [ ] Form öffnen ohne gespeichertes Projekt → Prompt-Dropdown ist `disabled` mit "— zuerst Projekt wählen —"
5. [ ] Form erneut öffnen nach vorheriger Auswahl → Prompt-Dropdown wird zurückgesetzt, erst nach Projektladen wieder befüllt
6. [ ] "Hinzufügen"-Button ist `disabled` solange Projekt ODER Prompt nicht gewählt
7. [ ] Projekt wählen + Prompt wählen → Button wird aktiv
8. [ ] Projekt zurücksetzen auf "— Projekt wählen —" → Prompt-Dropdown wird `disabled`, Button wird `disabled`
9. [ ] Prompt-Reihenfolge im Dropdown == Prioritätsreihenfolge in KanPrompt Backlog-Spalte
10. [ ] Mehrere Projekte wechseln → immer das zuletzt gewählte wird beim nächsten Öffnen wiederhergestellt

---

# Session-Log — Pflichtaufgabe nach Abschluss
