# Feature: Projekt-Kombifeld + optische Anpassungen → v0.10.0

## Problem / Motivation

Drei UI-Verbesserungen, davon eine Feature-Änderung (Projekt-Kombifeld):

**Dies ist eine Feature-Karte — Version von `0.8.2` auf `0.10.0` erhöhen.**

1. **Projektname im Header** zeigt `erju_wp27/doc/prompts/` — der `doc/prompts/`-Teil ist redundant, weil KanPrompt immer in diesem Unterordner arbeitet. Der Projektname allein (`erju_wp27`) reicht.

2. **Editor-Button in der Detailansicht** sagt "💻 VS Code", obwohl nicht jeder VS Code installiert hat. Der Companion-Server hat bereits einen Fallback auf den System-Default-Editor (`start "" "datei.md"`), aber der Button-Text suggeriert, dass VS Code nötig wäre.

3. **Projektwechsel** erfordert aktuell einen separaten 📂-Button, der den Welcome-Screen aufruft, wo man dann ein Projekt aus der Recent-Liste wählt. Das ist ein unnötiger Umweg. Besser: Der Projektname im Header wird zu einem **Kombinationsfeld (Dropdown)**, das die zuletzt geöffneten Projekte direkt anbietet. So ist der Wechsel ein Klick, und die Funktionalität ist selbsterklärend.

## Betroffene Dateien

- **`kanprompt.html`** — UI-Anpassungen
- **`companion/kanprompt-companion.js`** — Editor-Reihenfolge anpassen

## Soll-Zustand

### 0. Version erhöhen

In `kanprompt.html` die Versionskonstante ändern:

```javascript
const VERSION = '0.10.0';  // war '0.8.2'
```

Außerdem `document.title` im `DOMContentLoaded`-Handler prüfen — dort steht `'KanPrompt v' + VERSION`, das passt sich automatisch an.

Falls `CHANGELOG.md` existiert, dort einen neuen Eintrag ergänzen:

```markdown
## 0.10.0 — YYYY-MM-DD
- Feature: Projekt-Kombifeld im Header (Dropdown statt separater Wechsel-Button)
- Fix: Projektname zeigt nicht mehr redundant `doc/prompts/`
- Fix: Editor-Button sagt "Editor" statt "VS Code", nutzt System-Default
```

### 1. Projektname ohne `doc/prompts/`

In der Funktion `showApp()` die Zeile ändern:

Aktuell:
```javascript
document.getElementById('folderLabel').textContent = projectHandle.name + '/doc/prompts/';
```

Neu:
```javascript
document.getElementById('folderLabel').textContent = projectHandle.name;
```

### 2. Editor-Button generisch benennen

Im Preview-Panel den Button ändern:

Aktuell:
```html
<button class="btn btn-sm companion-only" onclick="openInEditor()" title="In VS Code öffnen" style="display:none;">💻 VS Code</button>
```

Neu:
```html
<button class="btn btn-sm companion-only" onclick="openInEditor()" title="In Editor öffnen" style="display:none;">💻 Editor</button>
```

### 3. Companion: Editor-Reihenfolge anpassen

Im `/open-editor`-Endpoint des Companion-Servers wird aktuell zuerst `code --goto` versucht und bei Fehler auf `start ""` (System-Default) zurückgefallen.

Die Reihenfolge umdrehen — direkt den System-Default verwenden (öffnet `.md` mit dem registrierten Handler, z.B. MarkText):

Aktuell in `kanprompt-companion.js`:
```javascript
exec(`code --goto "${resolved}${lineArg}"`, (err) => {
  if (err) {
    exec(`start "" "${resolved}"`, (err2) => { ... });
  } else {
    json(res, 200, { action: 'opened', editor: 'vscode', file: resolved });
  }
});
```

Neu:
```javascript
exec(`start "" "${resolved}"`, (err) => {
  if (err) return json(res, 500, { error: err.message });
  json(res, 200, { action: 'opened', editor: 'system-default', file: resolved });
});
```

Toast in `openInEditor()` optional kürzen:
```javascript
if (result && result.action) toast('💻 Im Editor geöffnet');
```

### 4. Projektname wird zum Kombinationsfeld (Dropdown)

Dies ist die wichtigste Änderung. Der statische `project-label`-Span und der separate 📂-Button werden durch ein Kombinationsfeld ersetzt, das:
- Den aktuellen Projektnamen anzeigt
- Beim Klick eine Dropdown-Liste der zuletzt geöffneten Projekte öffnet
- Am Ende der Liste eine Option "📂 Anderes Projekt öffnen..." für den Datei-Dialog bietet

#### 4a. HTML-Änderung im Header

Den bestehenden `project-label`-Span und den 📂-Button in `header-left` ersetzen:

Aktuell:
```html
<div class="header-left">
  <div class="logo">&gt;_ KanPrompt <span class="version-tag" id="versionTag"></span></div>
  <div class="project-label" id="folderLabel">—</div>
  <button class="btn" onclick="switchProject()" title="Projekt wechseln (Ctrl+Shift+O)">📂</button>
</div>
```

Neu:
```html
<div class="header-left">
  <div class="logo">&gt;_ KanPrompt <span class="version-tag" id="versionTag"></span></div>
  <div class="project-switcher" id="projectSwitcher">
    <div class="project-switcher-current" id="projectSwitcherCurrent" onclick="toggleProjectDropdown()">
      <span id="folderLabel">—</span>
      <span class="project-switcher-arrow">▾</span>
    </div>
    <div class="project-dropdown" id="projectDropdown"></div>
  </div>
</div>
```

#### 4b. CSS für das Kombinationsfeld

```css
.project-switcher {
  position: relative;
}
.project-switcher-current {
  font-size: 13px; color: var(--text-secondary);
  font-family: 'JetBrains Mono', monospace;
  background: var(--bg-card); padding: 4px 10px;
  border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);
  cursor: pointer; display: flex; align-items: center; gap: 6px;
  transition: var(--transition);
}
.project-switcher-current:hover {
  border-color: var(--border); color: var(--text-primary);
  background: var(--bg-card-hover);
}
.project-switcher-arrow {
  font-size: 10px; color: var(--text-muted);
  transition: transform 150ms;
}
.project-switcher.open .project-switcher-arrow {
  transform: rotate(180deg);
}
.project-dropdown {
  display: none; position: absolute; top: calc(100% + 4px); left: 0;
  min-width: 280px; max-width: 420px;
  background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0,0,0,.5);
  z-index: 50; overflow: hidden;
}
.project-switcher.open .project-dropdown {
  display: block;
}
.project-dropdown-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; cursor: pointer;
  font-size: 12px; color: var(--text-secondary);
  transition: var(--transition);
}
.project-dropdown-item:hover {
  background: var(--bg-card-hover); color: var(--text-primary);
}
.project-dropdown-item.active {
  color: var(--accent-blue); font-weight: 500;
}
.project-dropdown-item .item-name {
  flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-family: 'JetBrains Mono', monospace;
}
.project-dropdown-item .item-hint {
  font-size: 10px; color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
}
.project-dropdown-divider {
  height: 1px; background: var(--border-subtle); margin: 2px 0;
}
```

#### 4c. JavaScript-Logik

```javascript
function toggleProjectDropdown() {
  const switcher = document.getElementById('projectSwitcher');
  if (switcher.classList.contains('open')) {
    closeProjectDropdown();
  } else {
    renderProjectDropdown();
    switcher.classList.add('open');
  }
}

function closeProjectDropdown() {
  document.getElementById('projectSwitcher').classList.remove('open');
}

function renderProjectDropdown() {
  const dd = document.getElementById('projectDropdown');
  const projects = getRecentProjects();
  dd.innerHTML = '';

  // Zuletzt geöffnete Projekte
  projects.forEach(p => {
    const item = document.createElement('div');
    item.className = 'project-dropdown-item'
      + (projectHandle && p.name === projectHandle.name ? ' active' : '');
    const ago = timeAgo(p.ts);
    const hasHandle = false; // wird async nachgeladen
    item.innerHTML = `
      <span class="item-name">${esc(p.name)}</span>
      <span class="item-hint">${esc(ago)}</span>
    `;
    item.addEventListener('click', async () => {
      closeProjectDropdown();
      if (projectHandle && p.name === projectHandle.name) return; // schon offen
      await reopenProject(p.name);
    });
    dd.appendChild(item);

    // Async: Handle-Check für Icon (⚡ vs 📂)
    (async () => {
      const h = await getHandleFromIDB(p.name);
      const icon = h ? '⚡' : '📂';
      item.querySelector('.item-name').textContent = icon + ' ' + p.name;
    })();
  });

  // Trennlinie
  if (projects.length > 0) {
    const divider = document.createElement('div');
    divider.className = 'project-dropdown-divider';
    dd.appendChild(divider);
  }

  // "Anderes Projekt öffnen..."
  const openNew = document.createElement('div');
  openNew.className = 'project-dropdown-item';
  openNew.innerHTML = '<span class="item-name">📂 Anderes Projekt öffnen...</span>';
  openNew.addEventListener('click', () => {
    closeProjectDropdown();
    openProjectFolder();
  });
  dd.appendChild(openNew);
}

// Dropdown schließen bei Klick außerhalb
document.addEventListener('click', (e) => {
  const switcher = document.getElementById('projectSwitcher');
  if (switcher && !switcher.contains(e.target)) {
    closeProjectDropdown();
  }
});

// Dropdown schließen bei Escape
// (In den bestehenden keydown-Handler integrieren, VOR den anderen Escape-Handlern)
// if (e.key === 'Escape' && document.getElementById('projectSwitcher').classList.contains('open')) {
//   e.preventDefault(); closeProjectDropdown(); return;
// }
```

#### 4d. Bestehende `switchProject()`-Funktion anpassen

Der Shortcut `Ctrl+Shift+O` soll weiterhin funktionieren, aber jetzt das Dropdown öffnen statt den Welcome-Screen:

```javascript
// Im keydown-Handler:
if ((e.ctrlKey||e.metaKey) && e.shiftKey && e.key==='O') {
  e.preventDefault();
  toggleProjectDropdown();  // statt switchProject()
  return;
}
```

Die bestehende `switchProject()`-Funktion (die den Welcome-Screen zeigt) wird durch das Dropdown ersetzt. Falls jemand den Welcome-Screen braucht (z.B. beim allerersten Start ohne Projekt), bleibt `openProjectFolder()` als Fallback erhalten — das wird über "📂 Anderes Projekt öffnen..." im Dropdown aufgerufen.

#### 4e. Welcome-Screen bleibt für den Erststart

Wenn kein Projekt geöffnet ist (erster App-Start), wird weiterhin der Welcome-Screen mit der Recent-Liste angezeigt. Das Dropdown ist nur aktiv, wenn bereits ein Projekt geladen ist — also im `app`-Div, nicht im `welcomeScreen`.

## Constraints

- Keine Funktionsänderungen am Board, Drag&Drop, JSON-Handling
- Der Companion-Endpoint `/open-editor` muss weiterhin funktionieren wenn kein Editor installiert ist
- Welcome-Screen bleibt für den allerersten Start (kein Projekt gespeichert)
- `reopenProject()` und `openProjectFolder()` bleiben als bestehende Funktionen erhalten und werden vom Dropdown aufgerufen
- Dropdown schließt sich bei: Klick auf ein Projekt, Klick außerhalb, Escape-Taste
- Das aktive Projekt ist im Dropdown visuell hervorgehoben (`.active`-Klasse)
- Maximal 10 Projekte in der Recent-Liste (wie bisher)

## Nicht ändern

- Backlog-JSON, Prompt-Karten, Workflow-Doku
- Companion-Endpoints außer `/open-editor`
- CSS-Variablen (nur neue Klassen hinzufügen)
- IndexedDB-Handle-Speicherung und `reopenProject()`-Logik
- Welcome-Screen-Layout

## Verifikation

1. `const VERSION` in kanprompt.html ist `'0.10.0'`
2. Browser-Tab zeigt "KanPrompt v0.10.0"
3. Version-Tag im Header zeigt `v0.10.0`
4. Projekt öffnen → Header zeigt nur `erju_wp27` (ohne `/doc/prompts/`)
5. Projektname ist klickbar → Dropdown öffnet sich mit ▾-Pfeil
6. Dropdown zeigt alle Recent-Projekte mit ⚡/📂-Icon und Zeitangabe
7. Aktuelles Projekt ist blau/hervorgehoben markiert
8. Klick auf anderes Projekt → Projekt wechselt, Dropdown schließt sich
9. "📂 Anderes Projekt öffnen..." → öffnet den nativen Ordner-Dialog
10. Klick außerhalb → Dropdown schließt sich
11. Escape → Dropdown schließt sich
12. Ctrl+Shift+O → Dropdown öffnet/schließt sich (statt Welcome-Screen)
13. Erster App-Start (kein Projekt) → Welcome-Screen wie bisher
14. Preview-Panel → Button sagt "💻 Editor", nicht "💻 VS Code"
15. Editor-Button → Datei öffnet sich im System-Default-Editor
16. CHANGELOG.md enthält Eintrag für v0.10.0

## Session-Log — Pflichtaufgabe nach Abschluss

Nachdem alle Änderungen umgesetzt und verifiziert sind, ist als **letzter Schritt** folgendes zu tun:
Öffne diese Prompt-Datei und hänge am Ende ein ausgefülltes Session-Log an.
Ersetze dabei diesen gesamten Abschnitt durch das fertige Log.
