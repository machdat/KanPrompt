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

---

# Session-Log

- **Datum:** 2026-03-15T17:20:00
- **Branch:** master
- **Ergebnis:** Erfolgreich

## Zusammenfassung

Der "🧠 Claude.ai" Button wurde durch einen "🧠 Claude" Button ersetzt, der via `claude://` Protokoll Claude Desktop startet. Die gesamte URL-Verwaltung (KNOWN_CLAUDE_URLS, getClaudeAiUrl, setClaudeAiUrl, updateClaudeAiBtn, openClaudeAi) wurde entfernt und durch eine einfache `openClaudeDesktop()` Funktion ersetzt.

## Geänderte Dateien

- `kanprompt.html` — Button-HTML geändert (immer sichtbar, neue ID/Funktion), KNOWN_CLAUDE_URLS entfernt, 4 Claude.ai-Funktionen durch eine openClaudeDesktop() ersetzt, updateClaudeAiBtn()-Aufruf entfernt

## Abweichungen vom Prompt

Keine.

## Offene Punkte

Keine.
