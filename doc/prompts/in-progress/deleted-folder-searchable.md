# Deleted-Ordner durchsuchbar machen + Wiederherstellen

## Problem / Motivation

Wenn ein Prompt gelöscht wird, verschiebt `deleteItem()` die Markdown-Datei nach `deleted/` und entfernt den Eintrag aus `backlog-priority.json`. Danach ist der Prompt in KanPrompt nicht mehr sichtbar — man müsste im Dateisystem manuell in `doc/prompts/deleted/` nachschauen.

Das macht "Löschen" effektiv zu "Aus der Reichweite entfernen". Ein Anwender, der nur KanPrompt nutzt, hat keinen Zugriff mehr auf gelöschte Prompts.

## Ziel

Ein **Deleted-Overlay** (analog zum bestehenden Done-Archiv-Overlay), das:
1. Alle Dateien im `deleted/`-Ordner per Disk-Scan auflistet
2. Durchsuchbar ist (Titel/Dateiname)
3. Vorschau eines gelöschten Prompts ermöglicht
4. **Wiederherstellen** eines Prompts zurück ins Backlog erlaubt
5. **Endgültiges Löschen** einer Datei anbietet (mit Bestätigung)

## Betroffene Dateien

- **`kanprompt.html`** — Einzige Datei, die geändert wird

## Ist-Zustand

- `deleteItem()` verschiebt Datei nach `deleted/`, entfernt aus JSON → Prompt verschwindet
- `deleted/`-Ordner wird in `initProjectFromHandle()` angelegt (`{ create: true }`)
- Es gibt kein UI-Element um `deleted/` einzusehen
- Done-Archiv-Overlay existiert bereits und kann als Vorlage dienen

## Soll-Zustand

### 1. Deleted-Overlay (HTML)

Analog zum bestehenden `archiveOverlay`, aber für gelöschte Prompts:

```html
<!-- DELETED OVERLAY -->
<div class="archive-overlay" id="deletedOverlay">
  <div class="archive-panel">
    <div class="archive-header">
      <h2>🗑 Gelöscht</h2>
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="count" id="deletedCount">0</span>
        <button class="preview-close" onclick="closeDeleted()">✕</button>
      </div>
    </div>
    <input class="archive-search" id="deletedSearch" type="text"
           placeholder="Suche nach Dateiname..." oninput="filterDeleted()">
    <div class="archive-list" id="deletedList"></div>
  </div>
</div>
```

### 2. Zugangs-Button

In der Done-Spalte gibt es bereits den "📦 Archiv"-Button. Für Deleted einen analogen Zugang schaffen. Zwei Optionen, CC soll die passendere wählen:

**Option A:** Ein 🗑-Button in der Info-Bar unten (dezent, immer sichtbar)
**Option B:** Ein 🗑-Button im Header neben "📋 Workflow"

Der Button soll die Anzahl der gelöschten Dateien anzeigen, z.B. `🗑 3`.

### 3. Disk-Scan für deleted/

Da gelöschte Prompts nicht in der JSON stehen, muss der `deleted/`-Ordner direkt gescannt werden. Die bestehende Funktion `listMdFiles(folder)` kann dafür wiederverwendet werden:

```javascript
async function loadDeletedFiles() {
  const files = await listMdFiles('deleted');
  const items = [];
  for (const filename of files) {
    const id = filename.replace('.md', '');
    const title = id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    items.push({ id, file: filename, title });
  }
  return items;
}
```

Optional: Beim Laden die erste Zeile jeder Datei lesen (falls sie `# Titel` enthält), um den echten Titel zu extrahieren statt ihn aus dem Dateinamen abzuleiten. Das verbessert die Anzeige deutlich, da die Dateinamen oft Slugs sind:

```javascript
async function loadDeletedFiles() {
  const files = await listMdFiles('deleted');
  const items = [];
  for (const filename of files) {
    const id = filename.replace('.md', '');
    let title = id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    // Versuche echten Titel aus erster Zeile zu lesen
    const content = await readMdFile('deleted', filename);
    if (content) {
      const firstLine = content.split('\n')[0];
      if (firstLine.startsWith('# ')) title = firstLine.slice(2).trim();
    }
    items.push({ id, file: filename, title });
  }
  return items;
}
```

### 4. Overlay rendern (analog zu `renderArchiveList`)

```javascript
let deletedItems = [];

async function openDeleted() {
  document.getElementById('deletedSearch').value = '';
  document.getElementById('deletedOverlay').classList.add('open');
  deletedItems = await loadDeletedFiles();
  renderDeletedList('');
  setTimeout(() => document.getElementById('deletedSearch').focus(), 100);
}

function closeDeleted() {
  document.getElementById('deletedOverlay').classList.remove('open');
}

function filterDeleted() {
  renderDeletedList(document.getElementById('deletedSearch').value.trim().toLowerCase());
}

function renderDeletedList(q) {
  const list = document.getElementById('deletedList');
  const filtered = q
    ? deletedItems.filter(i => i.title.toLowerCase().includes(q) || i.file.toLowerCase().includes(q))
    : deletedItems;

  document.getElementById('deletedCount').textContent = filtered.length + ' / ' + deletedItems.length;
  list.innerHTML = '';

  if (!filtered.length) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12px;">Keine gelöschten Prompts</div>';
    return;
  }

  filtered.forEach(item => {
    const row = document.createElement('div');
    row.className = 'archive-item';
    row.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
        <div style="flex:1;min-width:0;">
          <div class="archive-item-title">${esc(item.title)}</div>
          <div class="archive-item-meta"><span>${esc(item.file)}</span></div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0;">
          <button class="btn btn-sm" onclick="event.stopPropagation();restoreDeleted('${esc(item.file)}')" title="Zurück ins Backlog">↩ Restore</button>
          <button class="btn btn-sm" onclick="event.stopPropagation();permanentDelete('${esc(item.file)}')" title="Endgültig löschen" style="color:var(--accent-red);">✕</button>
        </div>
      </div>
    `;
    row.addEventListener('click', () => previewDeleted(item));
    list.appendChild(row);
  });
}
```

### 5. Vorschau eines gelöschten Prompts

Beim Klick auf einen Eintrag die Datei im Preview-Panel öffnen (Read-Only):

```javascript
async function previewDeleted(item) {
  selectedId = null; selectedItem = item; selectedCol = null; editMode = false;
  const pp = document.getElementById('previewPanel');
  pp.classList.add('open');
  document.getElementById('previewTitle').textContent = '🗑 ' + item.title;
  document.getElementById('previewMeta').innerHTML = '<span>🗑 deleted/' + esc(item.file) + '</span>';
  document.getElementById('editToggleBtn').style.display = 'none';
  showReadView();
  const content = document.getElementById('previewContent');
  content.textContent = 'Lade...';
  const md = await readMdFile('deleted', item.file);
  content.innerHTML = md ? renderMarkdown(md) : '(Datei nicht lesbar)';
}
```

### 6. Wiederherstellen (`restoreDeleted`)

Verschiebt die Datei von `deleted/` zurück nach `new/` und fügt einen neuen Eintrag ins Backlog ein:

```javascript
async function restoreDeleted(filename) {
  if (!confirm('Prompt zurück ins Backlog verschieben?')) return;
  try {
    if (!await moveFile(filename, 'deleted', 'new')) return;

    const id = filename.replace('.md', '');
    let title = id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    // Versuche echten Titel aus Datei zu lesen
    const content = await readMdFile('new', filename);
    if (content) {
      const firstLine = content.split('\n')[0];
      if (firstLine.startsWith('# ')) title = firstLine.slice(2).trim();
    }

    jsonData.backlog.push({ id, file: filename, title, new: nowStr() });
    await writeJson();
    renderBoard();
    updateInfoBar();

    // Overlay aktualisieren
    deletedItems = deletedItems.filter(i => i.file !== filename);
    filterDeleted();

    toast('↩ Wiederhergestellt: ' + filename);
  } catch (e) {
    toast('Fehler: ' + e.message);
  }
}
```

### 7. Endgültiges Löschen (`permanentDelete`)

Löscht die Datei endgültig aus dem `deleted/`-Ordner. Doppelte Bestätigung, da nicht rückgängig machbar:

```javascript
async function permanentDelete(filename) {
  if (!confirm('⚠ "' + filename + '" endgültig löschen?\n\nDiese Aktion kann NICHT rückgängig gemacht werden!')) return;
  try {
    const dir = subDirs['deleted'];
    if (!dir) { toast('deleted/ Ordner nicht verfügbar'); return; }
    await dir.removeEntry(filename);
    delete fileContentsCache['deleted/' + filename];

    // Overlay aktualisieren
    deletedItems = deletedItems.filter(i => i.file !== filename);
    filterDeleted();

    toast('✕ Endgültig gelöscht: ' + filename);
  } catch (e) {
    toast('Fehler: ' + e.message);
  }
}
```

### 8. Deleted-Count aktualisieren

Die Anzahl gelöschter Dateien für den Button bereitstellen. Da ein Disk-Scan bei jedem Refresh teuer wäre, den Count nur aktualisieren wenn:
- Das Overlay geöffnet wird
- Ein Item gelöscht wird (`deleteItem()`)
- Ein Item restored wird

Dafür eine globale Variable `deletedCount` und eine leichtgewichtige Count-Funktion:

```javascript
let deletedCount = 0;

async function updateDeletedCount() {
  const files = await listMdFiles('deleted');
  deletedCount = files.length;
  const btn = document.getElementById('deletedBtn');
  if (btn) btn.textContent = '🗑' + (deletedCount > 0 ? ' ' + deletedCount : '');
}
```

`updateDeletedCount()` aufrufen in:
- `showApp()` (nach Projekt-Öffnung)
- `deleteItem()` (nach erfolgreichem Löschen)
- `restoreDeleted()` (nach Wiederherstellung)
- `permanentDelete()` (nach endgültigem Löschen)

### 9. Overlay-Positionierung

Das Deleted-Overlay soll die gleiche Positionierung wie das Archiv-Overlay verwenden (rechts, unter dem Header). Falls beide gleichzeitig offen sind, soll das zuletzt geöffnete oben liegen. Einfachste Lösung: Beim Öffnen des einen das andere schließen.

### 10. Keyboard-Shortcut

`d` als Shortcut für das Deleted-Overlay (analog zu bestehenden Shortcuts), nur wenn kein Input-Feld fokussiert ist.

## Constraints

- NUR `kanprompt.html` ändern
- Bestehende Prompt-Inhalte nicht verändern
- `deleteItem()` Verhalten beibehalten (Datei nach deleted/, aus JSON entfernen) — nur das Overlay ergänzen
- Die bestehenden Styles (`.archive-overlay`, `.archive-panel`, `.archive-item` etc.) wiederverwenden — kein eigenes CSS nötig, da das Deleted-Overlay identisch zum Done-Archiv aussehen soll
- Disk-Scan nur beim Öffnen des Overlays, nicht bei jedem Poll-Zyklus
- Endgültiges Löschen braucht doppelte Bestätigung (confirm-Dialog)

## Nicht ändern

- `backlog-priority.json` Struktur — gelöschte Items werden weiterhin NICHT in der JSON gespeichert
- Bestehende Prompt-Karten in `doc/prompts/`
- Done-Archiv-Overlay — bleibt wie es ist
- Companion-Server — nicht betroffen

## Verifikation

1. Projekt öffnen → Deleted-Button zeigt Anzahl (z.B. `🗑 3`)
2. Button klicken → Overlay öffnet sich, zeigt alle Dateien aus `deleted/`
3. Suchfeld filtern → Liste wird in Echtzeit gefiltert
4. Eintrag anklicken → Preview-Panel zeigt Inhalt (Read-Only)
5. "↩ Restore" klicken → Datei wandert nach `new/`, erscheint im Backlog, verschwindet aus Overlay
6. "✕" klicken → Bestätigungsdialog, danach Datei endgültig weg
7. Deleted-Count im Button aktualisiert sich nach Löschen/Restore
8. Overlay schließen mit ✕ oder Escape
9. Shortcut `d` öffnet/schließt das Overlay

## Session-Log — Pflichtaufgabe nach Abschluss

Nachdem alle Änderungen umgesetzt und verifiziert sind, ist als **letzter Schritt** folgendes zu tun:
Öffne diese Prompt-Datei und hänge am Ende ein ausgefülltes Session-Log an.
Ersetze dabei diesen gesamten Abschnitt durch das fertige Log.
