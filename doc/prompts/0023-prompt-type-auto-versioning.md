# Feature: Prompt-Typ und automatische Versionierung → Schema 1.1.0

## Problem / Motivation

Aktuell wird die App-Version (`const VERSION`) manuell in `kanprompt.html` gepflegt. Es gibt keinen Zusammenhang zwischen den Prompt-Karten und der Versionierung. Wenn ein Feature-Prompt abgeschlossen wird, muss man sich selbst merken, dass die Minor-Version erhöht werden soll.

Idee: Jede Prompt-Karte trägt einen **Typ** (`bugfix`, `feature`, `release`), der bestimmt, welcher Versionsanteil beim Abschluss erhöht wird:

- **bugfix** → Patch: `0.8.2` → `0.8.3`
- **feature** → Minor: `0.8.2` → `0.9.0` (Patch wird auf 0 gesetzt)
- **release** → Major: `0.8.2` → `1.0.0` (Minor und Patch werden auf 0 gesetzt)

Das macht die Versionierung zum natürlichen Teil des Workflows.

**Schema-Änderung:** Neues Feld `type` in der `backlog-priority.json` → Schema `1.0.0` → `1.1.0`. Damit wird auch das Migrations-Registry (aus `schema-version-display-and-upgrade`) zum ersten Mal produktiv genutzt.

## Betroffene Dateien

- **`kanprompt.html`** — UI, Logik, Migration
- **`workflow/schema.json`** — Schema-Definition auf 1.1.0 erweitern

## Soll-Zustand

### 1. Neues Feld `type` in der JSON

Jedes Item in `backlog`, `inProgress` und `done` bekommt ein optionales Feld `type`:

```json
{
  "id": "fix-geomap-radius",
  "file": "fix-geomap-radius.md",
  "title": "Fix: Geomap-Rendering bei negativen Radien",
  "type": "bugfix",
  "new": "2026-03-15T21:00:00"
}
```

Gültige Werte: `"bugfix"`, `"feature"`, `"release"`. Default (wenn nicht gesetzt): `"bugfix"`.

### 2. Typ-Auswahl im "Neuer Prompt"-Modal

Im bestehenden Modal (`modalOverlay`) ein Auswahlfeld ergänzen, zwischen Titel und Dateiname:

```html
<div class="form-group">
  <label>Typ</label>
  <div class="type-selector" id="newType">
    <button class="type-option active" data-type="bugfix" onclick="selectType(this)">🐛 Bugfix</button>
    <button class="type-option" data-type="feature" onclick="selectType(this)">✨ Feature</button>
    <button class="type-option" data-type="release" onclick="selectType(this)">🚀 Release</button>
  </div>
</div>
```

CSS:
```css
.type-selector { display: flex; gap: 4px; }
.type-option {
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
  padding: 4px 10px; border-radius: var(--radius-sm);
  border: 1px solid var(--border); background: var(--bg-card);
  color: var(--text-secondary); cursor: pointer; transition: var(--transition);
}
.type-option:hover { border-color: var(--border); color: var(--text-primary); }
.type-option.active[data-type="bugfix"] { border-color: var(--accent-orange); color: var(--accent-orange); background: rgba(210,153,34,.08); }
.type-option.active[data-type="feature"] { border-color: var(--accent-blue); color: var(--accent-blue); background: rgba(88,166,255,.08); }
.type-option.active[data-type="release"] { border-color: var(--accent-green); color: var(--accent-green); background: rgba(63,185,80,.08); }
```

JavaScript:
```javascript
function selectType(btn) {
  btn.parentElement.querySelectorAll('.type-option').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
function getSelectedType() {
  const active = document.querySelector('#newType .type-option.active');
  return active ? active.dataset.type : 'bugfix';
}
```

In `createNewPrompt()` den Typ ins JSON-Objekt aufnehmen:
```javascript
jsonData.backlog.push({ id, file: fn, title, type: getSelectedType(), new: today });
```

### 3. Typ-Badge auf der Karte

Im `createCard()` den Typ als farbigen Badge anzeigen, neben den bestehenden Badges:

```javascript
const typeLabels = { bugfix: '🐛', feature: '✨', release: '🚀' };
const typeColors = { bugfix: 'var(--accent-orange)', feature: 'var(--accent-blue)', release: 'var(--accent-green)' };
const t = item.type || 'bugfix';
// Im card-meta Bereich:
`<span class="badge" style="color:${typeColors[t]};border-color:${typeColors[t]}">${typeLabels[t]} ${t}</span>`
```

### 4. Typ in der Detailansicht (Preview-Meta)

Im `openPreview()` den Typ in der Meta-Zeile anzeigen:
```javascript
if (item.type) mh += `<span>${typeLabels[item.type]||''} ${item.type}</span>`;
```

### 5. Automatische Versionsberechnung beim Verschieben nach Done

Wenn eine Karte nach `done` verschoben wird (via Drag & Drop in `handleDrop()`), und die Karte einen `type` hat, wird die nächste Version berechnet und vorgeschlagen.

**Versionslogik:**
```javascript
function computeNextVersion(currentVersion, type) {
  const parts = currentVersion.split('.').map(Number);
  // Sicherheitshalber auf 3 Teile normalisieren
  while (parts.length < 3) parts.push(0);
  
  switch (type) {
    case 'release':
      return (parts[0] + 1) + '.0.0';
    case 'feature':
      return parts[0] + '.' + (parts[1] + 1) + '.0';
    case 'bugfix':
    default:
      return parts[0] + '.' + parts[1] + '.' + (parts[2] + 1);
  }
}
```

**Ablauf beim Drop auf Done:**

Nachdem die Datei verschoben und die JSON aktualisiert wurde, prüfen ob der `type` des Items eine Versionsänderung impliziert. Falls ja, einen Toast und ein kleines Bestätigungs-UI zeigen:

```javascript
// In handleDrop(), nach dem erfolgreichen Move nach done:
if (tgtCol.jsonKey === 'done' && item.type) {
  const nextVer = computeNextVersion(VERSION, item.type);
  if (nextVer !== VERSION) {
    suggestVersionBump(item, nextVer);
  }
}
```

**`suggestVersionBump()`** zeigt einen Toast mit Aktion:

```javascript
function suggestVersionBump(item, nextVersion) {
  const t = item.type || 'bugfix';
  const label = { bugfix: '🐛 Bugfix', feature: '✨ Feature', release: '🚀 Release' }[t];
  // Hinweis-Toast — die tatsächliche Versionsänderung muss in kanprompt.html
  // vorgenommen werden (const VERSION), das kann KanPrompt nicht selbst tun.
  toast(`${label} abgeschlossen → nächste Version: v${nextVersion}`);
  
  // Version in .kanprompt-version.json des Projekts aktualisieren
  // (die App-Version dort ist die "letzte bekannte App-Version")
  updateProjectVersionFile(nextVersion);
}

async function updateProjectVersionFile(newVersion) {
  if (!projectHandle) return;
  try {
    const vfh = await projectHandle.getFileHandle('.kanprompt-version.json');
    const vf = await vfh.getFile();
    const vd = JSON.parse(await vf.text());
    vd.app = newVersion;
    vd.updatedAt = nowStr();
    const w = await vfh.createWritable();
    await w.write(JSON.stringify(vd, null, 2) + '\n');
    await w.close();
  } catch {
    // .kanprompt-version.json existiert nicht — kein Fehler
  }
}
```

**Wichtig:** Die `const VERSION` in `kanprompt.html` kann die App nicht selbst ändern (sie ist eine lokale HTML-Datei). Der Toast ist ein Hinweis an den Entwickler. Die `.kanprompt-version.json` im Projekt wird aber automatisch aktualisiert — so weiß das Projekt, welche Version als nächstes ansteht.

### 6. Versions-Tracking in der Info-Bar

In der Info-Bar unten die aktuelle und die nächste geplante Version anzeigen. Dafür die höchste Versionsänderung aus allen offenen Karten (Backlog + In Progress) berechnen:

```javascript
function computePlannedVersion() {
  let highest = VERSION; // Start mit aktueller Version
  const allOpen = [...(jsonData.backlog || []), ...(jsonData.inProgress || [])];
  
  // Die "stärkste" Änderung gewinnt: release > feature > bugfix
  let dominantType = null;
  for (const item of allOpen) {
    const t = item.type || 'bugfix';
    if (t === 'release') { dominantType = 'release'; break; }
    if (t === 'feature' && dominantType !== 'release') dominantType = 'feature';
    if (t === 'bugfix' && !dominantType) dominantType = 'bugfix';
  }
  
  if (dominantType) {
    highest = computeNextVersion(VERSION, dominantType);
  }
  return { version: highest, type: dominantType };
}
```

In `updateInfoBar()` optional anzeigen:
```javascript
const planned = computePlannedVersion();
if (planned.type) {
  // z.B. "v0.8.2 → v0.9.0 (feature)"
  document.getElementById('versionPlanInfo').textContent =
    'v' + VERSION + ' → v' + planned.version;
}
```

### 7. Schema-Migration 1.0.0 → 1.1.0

Im `MIGRATIONS`-Array (aus der schema-version-display-and-upgrade-Karte) die neue Migration einfügen:

```javascript
{
  from: '1.0.0',
  to: '1.1.0',
  title: 'Prompt-Typ für automatische Versionierung',
  run: async (log) => {
    let changes = 0;
    
    // Bestehenden Items den Default-Typ 'bugfix' zuweisen
    for (const key of ['backlog', 'inProgress', 'done']) {
      for (const item of (jsonData[key] || [])) {
        if (!item.type) {
          item.type = 'bugfix';
          changes++;
        }
      }
    }
    
    if (changes > 0) {
      await writeJson();
      log('✓ ' + changes + ' Items mit Default-Typ "bugfix" ergänzt');
    } else {
      log('· Alle Items haben bereits einen Typ');
    }
    
    return changes;
  }
}
```

**Und `SCHEMA_VERSION` aktualisieren:**
```javascript
const SCHEMA_VERSION = '1.1.0';  // war '1.0.0'
```

### 8. `workflow/schema.json` erweitern

Die Schema-Definition um Version 1.1.0 ergänzen:

```json
{
  "currentVersion": "1.1.0",
  "versions": {
    "1.0.0": { ... },
    "1.1.0": {
      "released": "YYYY-MM-DD",
      "changes": "Neues Feld 'type' pro Item (bugfix|feature|release) für automatische Versionierung",
      "json": {
        "fields": {
          "backlog[]": ["id", "file", "title", "type", "new"],
          "inProgress[]": ["id", "file", "title", "type", "new", "inProgress"],
          "done[]": ["id", "file", "title", "type", "new", "inProgress", "done"]
        },
        "typeValues": ["bugfix", "feature", "release"],
        "typeDefault": "bugfix",
        "timestampFormat": "YYYY-MM-DDTHH:MM:SS"
      },
      "folders": ["doc/prompts/new/", "doc/prompts/in-progress/", "doc/prompts/done/", "doc/prompts/deleted/"],
      "files": ["doc/prompts/backlog-priority.json", "doc/prompts/README.md", "doc/prompts/TEMPLATE.md"]
    }
  }
}
```

## Constraints

- Das `type`-Feld ist optional — fehlender Typ wird als `bugfix` behandelt
- Bestehende Items ohne `type` funktionieren weiterhin (graceful degradation)
- Die Migration setzt bestehenden Items `"bugfix"` als Default — das ist korrekt, da bisher alle Prompts implizit Bugfixes oder Features waren und ein konservativer Default sinnvoll ist
- `const VERSION` in kanprompt.html wird durch diesen Prompt NICHT geändert — die Versionserhöhung der App passiert erst wenn die jeweilige Feature/Bugfix-Karte abgeschlossen wird
- `SCHEMA_VERSION` wird auf `1.1.0` erhöht
- Die Versionsberechnung ist rein informativ (Toast + .kanprompt-version.json) — sie ändert nicht die App selbst

## Nicht ändern

- Bestehende Prompt-Karten in `doc/prompts/`
- Drag & Drop Grundlogik — nur Erweiterung bei Drop auf Done
- Bestehende Migrationen im `MIGRATIONS`-Array — nur neue Migration anhängen
- Companion-Server

## Abhängigkeiten

Diese Karte setzt voraus, dass `schema-version-display-and-upgrade` abgeschlossen ist (das Migrations-Registry muss existieren).

## Verifikation

### Schema & Migration
1. `SCHEMA_VERSION` in kanprompt.html ist `'1.1.0'`
2. `workflow/schema.json` enthält Version `1.1.0` mit `type`-Felddefinition
3. Projekt ohne Schema öffnen → Upgrade durchführen → Migration null→1.0.0 UND 1.0.0→1.1.0 laufen nacheinander
4. Projekt auf Schema 1.0.0 öffnen → Upgrade zeigt nur Migration 1.0.0→1.1.0
5. Nach Migration: alle Items in der JSON haben ein `type`-Feld

### Typ-Auswahl
6. "Neuer Prompt"-Modal zeigt Typ-Auswahl (Bugfix/Feature/Release)
7. Default ist "Bugfix" (vorausgewählt)
8. Klick auf Feature → Badge wird blau, Bugfix wird deaktiviert
9. Erstellter Prompt hat `"type": "feature"` in der JSON

### Typ-Anzeige
10. Karten im Board zeigen den Typ als farbigen Badge (🐛/✨/🚀)
11. Preview-Meta zeigt den Typ
12. Karten ohne `type`-Feld zeigen Default 🐛 Bugfix

### Versionsberechnung
13. Feature-Prompt nach Done ziehen → Toast: "✨ Feature abgeschlossen → nächste Version: v0.X.0"
14. Bugfix-Prompt nach Done ziehen → Toast: "🐛 Bugfix abgeschlossen → nächste Version: v0.8.X"
15. `computeNextVersion('0.8.2', 'feature')` = `'0.9.0'`
16. `computeNextVersion('0.8.2', 'bugfix')` = `'0.8.3'`
17. `computeNextVersion('0.8.2', 'release')` = `'1.0.0'`
18. `.kanprompt-version.json` wird nach Done-Drop aktualisiert

---

# Session-Log

- **Datum:** 2026-03-18T20:55:00
- **Branch:** master
- **Ergebnis:** Erfolgreich

## Zusammenfassung
Prompt-Typ-System implementiert: Jede Karte trägt einen Typ (bugfix/feature/release), der die Versionierung steuert. Typ-Auswahl im Erstellungs-Modal, farbige Badges auf Karten und in der Preview, automatische Versionsberechnung beim Done-Drop mit Toast-Hinweis und .kanprompt-version.json-Update. Schema-Migration 1.0.0 → 1.1.0 setzt allen bestehenden Items `type: "bugfix"`.

## Geänderte Dateien
- `kanprompt.html` — CSS (.type-selector, .type-option, .badge-type), HTML (Typ-Auswahl im Modal, versionPlanInfo in Info-Bar), JS (TYPE_LABELS/TYPE_COLORS, selectType, getSelectedType, computeNextVersion, suggestVersionBump, updateProjectVersionFile, computePlannedVersion, Migration 1.0.0→1.1.0), SCHEMA_VERSION auf 1.1.0
- `workflow/schema.json` — Version 1.1.0 mit type-Felddefinition hinzugefügt

## Abweichungen vom Prompt
Keine.

## Offene Punkte
Keine.
