# Claude Desktop Button statt Claude.ai

## Problem / Motivation

Der bestehende "🧠 Claude.ai" Button öffnet eine claude.ai URL im Browser. Da Claude Desktop installiert ist und das `claude://` Protokoll funktioniert, soll der Button stattdessen Claude Desktop starten. Die gesamte URL-Verwaltung (localStorage, `KNOWN_CLAUDE_URLS`, Eingabe-Prompt) wird dadurch überflüssig und kann entfernt werden.

## Betroffene Dateien

- `kanprompt.html` — Button und zugehörige Funktionen

## Nicht ändern

- `companion/` — nicht betroffen
- `workflow/`, `install/`, `doc/prompts/` — nicht betroffen
- Alle anderen Buttons in der Header-Leiste
- Die Companion-Logik (`launchClaudeCode`, `companionPost`, etc.)

## Änderungen im Detail

### 1. Button im Header ändern

**Aktuell** (ca. Zeile 458):
```html
<button class="btn" onclick="openClaudeAi()" id="claudeAiBtn" style="display:none;" title="Claude.ai Projekt öffnen">🧠 Claude.ai</button>
```

**Neu:**
```html
<button class="btn" onclick="openClaudeDesktop()" id="claudeDesktopBtn" title="Claude Desktop öffnen">🧠 Claude</button>
```

Wichtige Unterschiede: Kein `style="display:none;"` mehr — der Button ist immer sichtbar. Neue ID, neuer Funktionsname, kürzerer Label-Text.

### 2. `KNOWN_CLAUDE_URLS` entfernen

**Aktuell** (ca. Zeile 578–580):
```javascript
// Known Claude.ai project URLs (auto-seeded into localStorage)
const KNOWN_CLAUDE_URLS = {
  'erju_wp27': 'https://claude.ai/project/019c5713-c18f-767d-b02d-a3eee86b68b6',
};
```

**Komplett entfernen** (inkl. Kommentar).

### 3. Claude.ai Funktionen ersetzen

**Aktuell** (ca. Zeile 718–754) — folgenden gesamten Block entfernen:
```javascript
// ══════════════════════════════════════
//  CLAUDE.AI PROJECT LINK
// ══════════════════════════════════════
function getClaudeAiUrl() { ... }
function setClaudeAiUrl(url) { ... }
function updateClaudeAiBtn() { ... }
function openClaudeAi() { ... }
```

**Ersetzen durch:**
```javascript
// ══════════════════════════════════════
//  CLAUDE DESKTOP
// ══════════════════════════════════════
function openClaudeDesktop() {
  window.open('claude://', '_blank');
}
```

### 4. `updateClaudeAiBtn()` Aufruf entfernen

**Aktuell** (ca. Zeile 1072):
```javascript
  renderBoard(); updateInfoBar(); startPoll();
  updateClaudeAiBtn();
```

**Neu** — die Zeile `updateClaudeAiBtn();` komplett entfernen:
```javascript
  renderBoard(); updateInfoBar(); startPoll();
```

## Constraints

- Nur `kanprompt.html` ändern
- Keine neuen Dependencies
- Der ⚡ Claude Code Button (Companion-basiert) bleibt unverändert
- Kein localStorage-Cleanup nötig — alte `kanprompt_claudeai_*` Einträge stören nicht und verschwinden irgendwann von selbst

## Verifikation

1. KanPrompt im Browser öffnen → "🧠 Claude" Button ist sofort sichtbar (auch ohne Companion, auch ohne Projekt)
2. Klick auf "🧠 Claude" → Claude Desktop öffnet sich
3. ⚡ Claude Code Button funktioniert weiterhin wie bisher (nur mit Companion)
4. In der HTML-Datei suchen: kein `KNOWN_CLAUDE_URLS`, kein `getClaudeAiUrl`, kein `setClaudeAiUrl`, kein `updateClaudeAiBtn`, kein `openClaudeAi`, kein `claudeAiBtn`
5. App startet ohne JavaScript-Fehler in der Konsole

## Session-Log — Pflichtaufgabe nach Abschluss

Nachdem alle Änderungen umgesetzt und verifiziert sind, ist als **letzter Schritt** folgendes zu tun:

Öffne diese Prompt-Datei und hänge am Ende — unterhalb dieses Abschnitts — ein ausgefülltes Session-Log an. Ersetze dabei diesen gesamten Abschnitt (ab der Überschrift „Session-Log") durch das fertige Log.

Das Log muss folgende Struktur haben:

---

# Session-Log

- **Datum:** (heutiges Datum im Format YYYY-MM-DDTHH:MM:SS)
- **Branch:** (Branch-Name)
- **Ergebnis:** (Erfolgreich / Teilweise / Fehlgeschlagen)

## Zusammenfassung

(1-3 Sätze: Was wurde tatsächlich umgesetzt?)

## Geänderte Dateien

(Liste aller geänderten Dateien mit Kurzbeschreibung der Änderung)

## Abweichungen vom Prompt

(Falls die Umsetzung vom Prompt abwich: Was wurde anders gemacht und warum? Falls keine Abweichung: „Keine.")

## Offene Punkte

(Falls etwas offen geblieben ist. Falls nichts: „Keine.")
