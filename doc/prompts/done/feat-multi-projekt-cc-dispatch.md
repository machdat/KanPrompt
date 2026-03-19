# CC Dispatch Manager: Auftrags-Queue für CC-Instanzen

## Problem / Motivation

Aktuell startet man CC aus der Vorschau einer einzelnen Prompt-Karte heraus. Was fehlt: ein zentrales Fenster, in dem man mehrere Aufträge vorbereiten, starten, überwachen und aufräumen kann — projektübergreifend.

## Ziel

Ein Dispatch-Panel (Overlay) in KanPrompt, das wie eine Taskliste funktioniert:

```
┌─ CC Dispatch ─────────────────────────────────────────────────────────────┐
│                                                                           │
│  (1)  KanPrompt    #51 CC-Launch Live-Runner      🟢 done   38s  $0.11  [Resume] [✕] │
│  (2)  erju_wp27    #14 Fix BaliseGroup Direction   🟡 running 12s        [Stop]  [✕] │
│  (3)  KanPrompt    #44 CC-Status-Dashboard         ⚪ ready              [Run]   [✕] │
│  (4)  erju_wp27    #15 SHACL-Validation erweitern  ⚪ ready              [Run]   [✕] │
│                                                                           │
│  [+ Auftrag hinzufügen]                              Git-Status ▾        │
└───────────────────────────────────────────────────────────────────────────┘
```

Jede Zeile ist ein **Auftrag**: Projekt + Prompt-Karte, mit Ampel-Status und Aktions-Buttons.

## Konzept

### Auftrags-Zeile

Jeder Auftrag hat:
- **Projekt** — Name (z.B. "KanPrompt", "erju_wp27")
- **Prompt** — Nummer + Titel aus dem Backlog des jeweiligen Projekts
- **Ampel-Status**:
  - ⚪ `ready` — vorbereitet, noch nicht gestartet
  - 🟡 `running` — CC arbeitet (mit Live-Info: letzter Tool-Aufruf, Laufzeit-Ticker)
  - 🟢 `done` — erfolgreich abgeschlossen (Dauer + Kosten)
  - 🔴 `error` — fehlgeschlagen
- **Aktions-Buttons** (kontextabhängig):
  - `ready` → **[Run]** startet CC (wie ⚡-Button in der Vorschau)
  - `running` → **[Stop]** bricht ab, **[Fokus]** bringt Terminal nach vorne
  - `done` → **[Resume]** öffnet interaktive Session, **[Log]** zeigt Event-Verlauf
  - alle → **[✕]** entfernt den Auftrag aus der Liste

### Auftrag hinzufügen

**"+ Auftrag hinzufügen"** öffnet einen Mini-Dialog:
1. **Projekt wählen** — Dropdown mit allen Recent-Projekten
2. **Prompt wählen** — Dropdown mit Backlog-Karten (`new/`) des gewählten Projekts
3. **Optionen** — Worktree ja/nein, allowedTools
4. **[Hinzufügen]** → Auftrag erscheint als ⚪ `ready` in der Liste

Alternativ: Aus der Vorschau heraus → "Zum Dispatch hinzufügen" statt direkt starten.

### Git-Status-Sektion (aufklappbar)

Unterhalb der Auftrags-Liste, aufklappbar:
```
▾ Git-Status
  KanPrompt        master  ✔
  erju_wp27        develop ● 3M 1?  ↑2
    └ feature/fix-balise   ● 1M
    └ feature/shacl-val    ✔
```

Zeigt für jedes Projekt: Branch, dirty/clean, modified/untracked, ahead/behind.
Zeigt Worktrees eingerückt unter dem Haupt-Projekt.

## Betroffene Dateien

- `kanprompt.html` — Dispatch-Overlay: UI, Auftrags-Liste, Add-Dialog, Git-Status-Sektion
- `companion/kanprompt-companion.js` — Neue/erweiterte Endpoints:
  - `POST /project-backlog { projectPath }` — Backlog-Karten eines beliebigen Projekts laden
  - `POST /git-status { projectPath }` — Branch + dirty/clean + modified/untracked
  - `POST /git-status-all { projectPaths }` — Batch für alle Recent-Projekte
  - `POST /cc-stop { instanceId }` — Laufende CC-Instanz abbrechen
  - `POST /focus-window { instanceId }` — Terminal-Fenster nach vorne bringen
  - Bestehend: `/start-cc`, `/cc-instances`, `/cc-event`, `/cc-status-stream`, `/worktree-list`

## Ist-Zustand

- CC-Dashboard (#44) zeigt laufende/beendete Instanzen — aber nur als passive Übersicht
- Man kann keine Aufträge vorbereiten oder queuen
- Man muss zum Projekt wechseln um dessen Backlog zu sehen
- Kein Git-Status nirgendwo
- Kein "Stop"-Mechanismus für laufende Instanzen

## Soll-Zustand

### 1. Dispatch-State (In-Memory, KanPrompt-seitig)

```javascript
// Auftrags-Liste lebt im Browser (KanPrompt), nicht im Companion
const dispatchQueue = [
  {
    id: 'disp-1',
    project: { name: 'KanPrompt', path: 'C:\\git\\local\\KanPrompt' },
    prompt: { num: 51, title: 'CC-Launch Live-Runner', file: 'cc-launch-live-runner.md' },
    status: 'done',           // ready | running | done | error
    instanceId: 'cc-17108..', // gesetzt nach Start, verknüpft mit Companion-Registry
    sessionId: 'a60f6aa9..',  // gesetzt nach Abschluss, für Resume
    duration: 38.8,
    cost: 0.11,
    lastTool: null,
    worktree: true,
    addedAt: '2026-03-19T21:00:00',
  },
  // ...
];
```

### 2. Backlog eines fremden Projekts laden

Neuer Endpoint: `POST /project-backlog { projectPath }`

Der Companion liest `{projectPath}/doc/prompts/backlog-priority.json` und gibt die `backlog`-Einträge zurück. Damit kann KanPrompt das Prompt-Dropdown für ein beliebiges Projekt befüllen, ohne dorthin wechseln zu müssen.

### 3. Git-Status

Neuer Endpoint: `POST /git-status { projectPath }`

Parst `git status --porcelain=v2 --branch` und liefert:
```json
{
  "branch": "master",
  "dirty": true,
  "modified": 3,
  "untracked": 1,
  "staged": 0,
  "ahead": 0,
  "behind": 0,
  "summary": "master ● 3M 1?"
}
```

Batch-Variante: `POST /git-status-all { projectPaths: [...] }` für alle Recent-Projekte in einem Call.

### 4. CC stoppen

Neuer Endpoint: `POST /cc-stop { instanceId }`

Der Companion kennt die PID des `exec()`-Prozesses. Kill via `process.kill(pid)` oder `taskkill`. Status in Registry auf `error` setzen mit `message: 'Manuell gestoppt'`.

Dafür muss `launchCCLiveRunner()` die PID des gestarteten Prozesses in der Instanz-Registry speichern.

### 5. Terminal fokussieren

Neuer Endpoint: `POST /focus-window { instanceId }`

Terminal-Titel enthält `instanceId`. PowerShell-Einzeiler:
```powershell
(Get-Process | Where-Object { $_.MainWindowTitle -match 'cc-17108' }).MainWindowHandle | ForEach-Object { [Win32]::SetForegroundWindow($_) }
```

Fallback falls nicht möglich: Endpoint gibt `sessionId` und `cwd` zurück → KanPrompt öffnet neues Resume-Terminal.

### 6. UI-Integration

**Trigger:** Der bestehende 📊-Button im Header öffnet das Dispatch-Panel (ersetzt das bisherige Dashboard).

**Auftrags-Zeilen** werden live aktualisiert:
- Polling auf `/cc-instances` alle 2s (wie bisher)
- Abgleich mit `dispatchQueue`: Wenn eine Instanz-ID in der Companion-Registry den Status ändert, wird die Zeile aktualisiert

**Persistenz:** `dispatchQueue` wird in `localStorage` gespeichert. Beendete Aufträge bleiben sichtbar bis der User sie mit [✕] entfernt.

## Umsetzungsreihenfolge

1. **`POST /project-backlog`** — Backlog eines fremden Projekts laden (Basis für Add-Dialog)
2. **`POST /git-status`** — Git-Status-Endpoint (testbar per curl)
3. **Dispatch-UI Grundgerüst** — Overlay mit statischer Auftrags-Liste und Add-Dialog
4. **Verknüpfung mit `/start-cc`** — [Run] startet CC, `instanceId` wird in der Zeile gespeichert
5. **Live-Update** — Polling-Abgleich für Ampel + lastTool + Dauer
6. **`POST /cc-stop`** — Stop-Button für laufende Instanzen
7. **Git-Status-Sektion** — Aufklappbar unterhalb der Auftrags-Liste
8. **`POST /focus-window`** — Nice-to-have, kann auch später

## Constraints

- `dispatchQueue` lebt im Browser — geht beim Tab-Schließen nicht verloren (localStorage), aber beim Cache-Clear schon
- Companion-Registry bleibt In-Memory — nach Companion-Neustart sind laufende Instanzen "lost" (Dispatch zeigt sie als `ready` oder `error`)
- `POST /project-backlog` muss die gleiche JSON-Struktur wie KanPrompts eigenes Backlog-Laden verwenden
- Git-Status-Polling maximal alle 5s (ist schnell, aber nicht übertreiben)
- Stop-Mechanismus muss den `cc-live-runner.js`-Prozess UND den darunterliegenden `claude`-Prozess killen

## Verifikation

1. [ ] Dispatch öffnen → Leere Liste mit [+ Auftrag hinzufügen]
2. [ ] Auftrag hinzufügen → Projekt-Dropdown zeigt Recent-Projekte
3. [ ] Projekt wählen → Prompt-Dropdown zeigt Backlog-Karten des Projekts
4. [ ] Auftrag hinzugefügt → Zeile mit ⚪ `ready` und [Run]-Button
5. [ ] [Run] klicken → Ampel wechselt zu 🟡 `running`, Timer tickt, lastTool wird angezeigt
6. [ ] CC beendet sich → Ampel wechselt zu 🟢 `done`, Dauer + Kosten sichtbar, [Resume]-Button
7. [ ] [Resume] → Terminal öffnet sich mit `claude --resume`
8. [ ] [Stop] bei laufender Instanz → Ampel auf 🔴, CC-Prozess wird beendet
9. [ ] [✕] → Auftrag verschwindet aus Liste
10. [ ] Git-Status-Sektion → Branch + dirty/clean für alle Recent-Projekte
11. [ ] KanPrompt neu laden → Dispatch-Queue aus localStorage wiederhergestellt

---

# Session-Log

- **Datum:** 2026-03-19T22:30:00
- **Branch:** feature/feat-multi-projekt-cc-dispatch
- **Ergebnis:** Erfolgreich

## Zusammenfassung
CC-Dashboard durch vollwertigen Dispatch-Manager ersetzt. Neue Auftrags-Queue mit Ampel-Status, projektübergreifendem Add-Dialog, Git-Status-Sektion und 5 neuen Companion-Endpoints (project-backlog, git-status, git-status-all, cc-stop, focus-window). PID-Tracking für Stop-Funktionalität. localStorage-Persistenz der Queue.

## Geänderte Dateien
- `companion/kanprompt-companion.js` — v0.8.0 → v0.9.0: 5 neue Endpoints, parseGitStatus(), PID-Tracking in Registry, pid-Event-Typ
- `kanprompt.html` — v0.17.0 → v0.18.0: CC-Dashboard komplett durch Dispatch-Panel ersetzt (CSS, HTML-Overlay, gesamter JS-Block), "+ Dispatch"-Button in Vorschau

## Abweichungen vom Prompt
Keine.

## Offene Punkte
Keine.
