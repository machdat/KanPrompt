# CC-Status-Dashboard: Live-Tracking aktiver CC-Instanzen

## Problem / Motivation

Der Live-Runner (#51) zeigt CC-Fortschritt im Terminal. Aber wenn man mehrere Prompts startet oder das Terminal minimiert hat, fehlt die Übersicht in KanPrompt selbst:

- Welche CC-Instanzen laufen gerade? Welche sind fertig?
- Was tut eine Instanz gerade (welches Tool, welche Datei)?
- Wie lange läuft sie schon? Was hat sie gekostet?
- Welche Worktrees sind offen und können aufgeräumt werden?

## Fundament (bereits implementiert durch #51)

- **`cc-live-runner.js`** parst `stream-json` Events und kennt `session_id`, `duration`, `cost`, Tool-Aufrufe
- **`/start-cc` Endpoint** im Companion startet den Runner und gibt `configPath` zurück
- **Config-JSON** pro Instanz wird in `os.tmpdir()` geschrieben (und nach Abschluss gelöscht)
- **`exec()` + `stream-json --verbose`** liefert NDJSON-Events: `assistant` (mit `tool_use` und `text` Blöcken) und `result`

## Betroffene Dateien

- `companion/kanprompt-companion.js` — Instanz-Registry, SSE-Endpoint, Worktree-Endpoints
- `companion/cc-live-runner.js` — Events an Companion zurückmelden (nicht nur Terminal-Output)
- `kanprompt.html` — Dashboard-Panel mit Live-Status

## Ist-Zustand

- Companion startet CC-Instanzen per `launchCCLiveRunner()`, vergisst sie aber sofort
- `cc-live-runner.js` zeigt Events nur im Terminal, meldet nichts an den Companion zurück
- KanPrompt hat keine Möglichkeit zu sehen was läuft
- Config-JSON wird nach Abschluss gelöscht — kein Rückblick möglich

## Soll-Zustand

### 1. Instanz-Registry im Companion (In-Memory)

```javascript
// Companion hält eine Map aller gestarteten Instanzen
const ccInstances = new Map(); // id → { id, prompt, cwd, branch, startedAt, status, sessionId, events[], cost, duration }

// Beim Start (/start-cc): Instanz registrieren
const instanceId = 'cc-' + Date.now();
ccInstances.set(instanceId, {
  id: instanceId,
  prompt: promptInstruction,
  cwd: resolved,
  branch: branchName || null,
  worktree: isWorktree,
  startedAt: new Date().toISOString(),
  status: 'running',       // running | done | error
  sessionId: null,          // wird vom Runner nachgeliefert
  lastTool: null,           // z.B. "Edit: src/calculator.js"
  cost: null,
  duration: null,
  events: [],               // letzte N Events für Rückblick
});
```

### 2. Callback-Endpoint für den Live-Runner

Neuer Endpoint: `POST /cc-event`

Der `cc-live-runner.js` meldet Events an den Companion zurück (parallel zum Terminal-Output):

```javascript
// In cc-live-runner.js, nach jedem geparsten Event:
fetch('http://127.0.0.1:9177/cc-event', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ instanceId, type: 'tool_use', tool: 'Edit', file: 'src/calculator.js' })
}).catch(() => {}); // fire-and-forget, Fehler ignorieren

// Bei result-Event:
fetch('http://127.0.0.1:9177/cc-event', {
  method: 'POST',
  body: JSON.stringify({ instanceId, type: 'result', sessionId, duration, cost })
}).catch(() => {});
```

Der Companion aktualisiert die Registry bei jedem Event.

### 3. SSE-Endpoint für KanPrompt-UI

Neuer Endpoint: `GET /cc-status-stream`

Server-Sent Events, die KanPrompt im Browser abonniert:

```javascript
// Browser-Seite:
const sse = new EventSource('http://127.0.0.1:9177/cc-status-stream');
sse.onmessage = (e) => {
  const data = JSON.parse(e.data);
  updateDashboard(data);
};
```

Events: `instance-started`, `tool-use`, `instance-done`, `instance-error`

### 4. Status-Abfrage (Snapshot)

Neuer Endpoint: `GET /cc-instances`

Gibt alle Instanzen zurück (laufende + letzte N beendete). Für den initialen Dashboard-Aufbau beim Öffnen.

### 5. Worktree-Management

Neue Endpoints:

- `POST /worktree-list { projectPath }` — `git worktree list --porcelain` parsen, als JSON zurückgeben
- `POST /worktree-remove { worktreePath }` — `git worktree remove {path}` (mit `--force` Option)
- `POST /worktree-merge { worktreePath, targetBranch }` — Merge + Worktree entfernen

### 6. Dashboard-UI in KanPrompt

**Trigger:** Neuer Button im Header (z.B. `📊` oder Indikator-Badge das die Anzahl laufender Instanzen zeigt).

**Overlay** (gleicher Stil wie Archiv-Overlay):

Obere Sektion — **Laufende CC-Instanzen**:
```
┌─────────────────────────────────────────────────┐
│ ⚡ feat/cc-launch-live-runner  │ 34s │ Edit: kanprompt.html │
│ ⚡ bugfix/fix-encoding        │ 12s │ Read: src/utils.js   │
└─────────────────────────────────────────────────┘
```
Jede Zeile: Branch/Prompt-Name, Laufzeit (live ticker), letzter Tool-Aufruf. Klick öffnet das zugehörige Terminal (falls noch offen) oder zeigt Event-Log.

Untere Sektion — **Beendete Instanzen** (letzte 10):
```
┌─────────────────────────────────────────────────┐
│ ✅ feat/cc-launch-live-runner │ 38.8s │ $0.11 │ Resume │
│ ✅ test-calculator            │ 34.5s │ $0.16 │ Resume │
└─────────────────────────────────────────────────┘
```
Jede Zeile: Name, Dauer, Kosten, Resume-Button (öffnet `claude --resume {sessionId}`).

Separate Sektion — **Worktrees** (optional, aufklappbar):
```
┌─────────────────────────────────────────────────┐
│ 📂 feature/cc-launch-live-runner │ 3 commits │ Merge │ Löschen │
│ 📂 bugfix/fix-encoding          │ 1 commit  │ Merge │ Löschen │
└─────────────────────────────────────────────────┘
```

## Umsetzungsreihenfolge

1. **Instanz-Registry + `/cc-event` + `/cc-instances`** — Companion-seitig. Kann ohne UI getestet werden (curl/fetch).
2. **`cc-live-runner.js` erweitern** — `instanceId` aus Config lesen, Events an `/cc-event` melden.
3. **`/start-cc` anpassen** — `instanceId` generieren, in Config schreiben, in Registry eintragen.
4. **Dashboard-UI** — Overlay mit Polling auf `/cc-instances` (alle 2s). SSE ist Bonus, Polling reicht für v1.
5. **Worktree-Endpoints + UI** — Separater Schritt, kann auch als eigene Karte abgetrennt werden.

## Constraints

- Registry ist In-Memory — geht beim Companion-Neustart verloren. Für v1 akzeptabel.
- `cc-live-runner.js` muss weiterhin standalone funktionieren (ohne Companion, z.B. im Testbed). Die fetch-Aufrufe sind fire-and-forget mit catch.
- SSE-Endpoint muss CORS-Header setzen (wie alle anderen Endpoints).
- Dashboard-Polling darf den Companion nicht überlasten — max 1 Request/2s.
- Beendete Instanzen nach 1h aus der Registry entfernen (oder konfigurierbar).

## Verifikation

1. [ ] CC über "⚡ CC" starten → Companion-Log zeigt "Instanz registriert"
2. [ ] `GET /cc-instances` während CC läuft → Instanz mit `status: running`, aktuellem `lastTool`
3. [ ] CC beendet sich → Instanz-Status wechselt auf `done`, `cost` und `duration` gesetzt
4. [ ] Dashboard öffnen → Laufende Instanzen mit Live-Ticker sichtbar
5. [ ] Beendete Instanz → Resume-Button öffnet Terminal mit `claude --resume`
6. [ ] Mehrere Instanzen parallel → Alle im Dashboard sichtbar
7. [ ] Worktree-Liste → Korrekte Auflistung, Merge/Löschen funktioniert

## Session-Log — Pflichtaufgabe nach Abschluss

Nachdem alle Änderungen umgesetzt und verifiziert sind, ist als **letzter Schritt** folgendes zu tun:
Öffne diese Prompt-Datei und hänge am Ende ein ausgefülltes Session-Log an.
Ersetze dabei diesen gesamten Abschnitt durch das fertige Log.