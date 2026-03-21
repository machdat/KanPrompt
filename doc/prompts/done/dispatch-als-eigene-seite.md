# Dispatch Manager als eigenständige Seite (dispatch.html)

## Problem / Motivation

Der Dispatch Manager lebt aktuell als Overlay innerhalb von `kanprompt.html`. Das hat Nachteile:
- Man kann Dispatch und Kanban-Board nicht gleichzeitig sehen
- Dispatch blockiert die Interaktion mit dem Board solange es offen ist
- Auf einem zweiten Monitor wäre ein eigenständiges Dispatch-Fenster ideal
- Der Code in `kanprompt.html` wächst unkontrolliert weiter

Ziel: `dispatch.html` als eigenständige, vom Companion servierte Seite, die neben KanPrompt in einem eigenen Tab/Fenster läuft.

## Betroffene Dateien

- **Neu:** `dispatch.html` — Eigenständige Single-File-App (HTML + CSS + JS inline, wie `kanprompt.html`)
- `companion/kanprompt-companion.js` — Neuer `GET /dispatch`-Route zum Ausliefern der Seite
- `kanprompt.html` — Dispatch-Overlay entfernen, 📊-Button wird zum Link auf `http://127.0.0.1:9177/dispatch`

## Ist-Zustand

- Dispatch ist ein Overlay in `kanprompt.html` (HTML-Block, CSS, JS — alles inline)
- Öffnen via 📊-Button im Header
- Overlay blockiert das Board darunter
- Companion ist ein reiner API-Server, liefert keine HTML-Seiten aus
- `kanprompt.html` wird als `file://` geöffnet, nicht vom Companion serviert

## Soll-Zustand

### 1. Companion serviert dispatch.html

Neuer GET-Endpoint:

```
GET /dispatch → Content-Type: text/html, liefert dispatch.html aus
```

Die Datei `dispatch.html` liegt im Repo-Root (neben `kanprompt.html`). Der Companion liest sie von Disk und liefert sie aus. Der Companion kennt seinen eigenen Repo-Pfad bereits (`__dirname` → `companion/`, also `path.resolve(__dirname, '..', 'dispatch.html')`).

Erreichbar unter: `http://127.0.0.1:9177/dispatch`

### 2. dispatch.html — Eigenständige App

Aufbau analog zu `kanprompt.html`: Alles in einer Datei (HTML + CSS + JS).

**Inhalt (aus kanprompt.html extrahiert):**
- Komplettes Dispatch-Panel (Auftrags-Queue, Add-Dialog, Git-Status-Sektion)
- Alle zugehörigen CSS-Styles
- Alle zugehörigen JS-Funktionen (dispatchQueue, Polling, localStorage-Persistenz, etc.)
- Eigener HTML-Header mit Titel "KanPrompt Dispatch"

**Geteilte Abhängigkeiten:**
- Companion-URL: `http://127.0.0.1:9177` (hardcoded, wie in kanprompt.html)
- Endpoints: `/cc-instances`, `/cc-status-stream`, `/start-cc`, `/cc-stop`, `/project-backlog`, `/git-status`, `/git-status-all`, `/focus-window`, `/worktree-list`, `/cc-event`
- localStorage-Keys: Dispatch-Queue muss denselben Key verwenden, damit Zustand zwischen kanprompt.html (falls dort ein Mini-Status bleibt) und dispatch.html synchron ist

**Eigenständiges Styling:**
- Eigenes Farbschema / Layout (kein Overlay mehr, sondern Vollseite)
- Responsive: Auftrags-Liste nimmt die volle Breite ein
- Git-Status-Sektion unterhalb, aufklappbar
- Header-Leiste mit: Titel, Link zurück zu KanPrompt (falls als file:// bekannt), Companion-Status-Indikator

### 3. kanprompt.html — Dispatch-Overlay entfernen

- Gesamter Dispatch-Overlay HTML-Block entfernen
- Zugehörige CSS-Regeln entfernen
- Zugehörige JS-Funktionen entfernen (Dispatch-Queue-Management, Add-Dialog, Git-Status-Rendering, etc.)
- 📊-Button im Header wird zu einem Link: `window.open('http://127.0.0.1:9177/dispatch', 'kanprompt-dispatch')`
  - `window.open` mit festem Name → öffnet immer denselben Tab/dasselbe Fenster (kein Duplikat)
- Optional: Mini-Status-Badge am 📊-Button (z.B. "2 running") via kurzes Polling auf `/cc-instances`

### 4. Shared State via localStorage

Beide Seiten (kanprompt.html und dispatch.html) laufen auf unterschiedlichen Origins (`file://` vs. `http://127.0.0.1:9177`). Daher ist **localStorage NICHT geteilt**.

Lösungsansätze (einen wählen):
- **A) Companion als State-Broker:** Dispatch-Queue wird im Companion persistiert (`POST /dispatch-queue` zum Speichern, `GET /dispatch-queue` zum Laden). Beide Seiten synchen über den Companion.
- **B) dispatch.html ist die Single Source of Truth:** Nur dispatch.html verwaltet die Queue. kanprompt.html zeigt höchstens einen Badge via `/cc-instances` (das ist Companion-State, kein localStorage).
- **C) kanprompt.html ebenfalls via Companion servieren:** Dann gleicher Origin, gleicher localStorage. Großer Umbau, eher nicht jetzt.

**Empfehlung: Variante B.** kanprompt.html braucht keine eigene Queue-Kopie. Der 📊-Button zeigt via Polling auf `/cc-instances` nur die Anzahl laufender Instanzen als Badge. Die volle Queue lebt ausschließlich in dispatch.html.

## Umsetzungsreihenfolge

1. **`GET /dispatch`-Route** im Companion — `dispatch.html` von Disk lesen und ausliefern
2. **dispatch.html Grundgerüst** — Header, leere Queue-Ansicht, Companion-Ping
3. **Dispatch-Code aus kanprompt.html extrahieren** — JS/CSS/HTML in dispatch.html überführen, Vollseiten-Layout statt Overlay
4. **kanprompt.html aufräumen** — Dispatch-Overlay entfernen, 📊-Button auf `window.open` umbauen
5. **Mini-Badge in kanprompt.html** — Optional: Anzahl laufender CC-Instanzen am Button
6. **Styling & Polish** — Eigenständiges Farbschema, responsive Layout

## Constraints

- `dispatch.html` muss als Single-File funktionieren (kein Build-Step, keine externen CSS/JS)
- Companion darf keine weiteren npm-Dependencies bekommen (reines `fs.readFile` für HTML-Serving)
- localStorage in dispatch.html gehört dispatch.html allein (kein Cross-Origin-Sharing nötig bei Variante B)
- Version von dispatch.html separat tracken (eigenes `const VERSION` im Script-Block)
- CHANGELOG.md-Eintrag erforderlich

## Verifikation

1. [ ] `http://127.0.0.1:9177/dispatch` liefert eine funktionierende HTML-Seite
2. [ ] Dispatch-Seite zeigt Auftrags-Queue, Add-Dialog, Git-Status — wie bisher das Overlay
3. [ ] [Run] in dispatch.html startet CC korrekt, Ampel-Updates funktionieren
4. [ ] [Resume], [Stop], [✕] funktionieren wie bisher
5. [ ] 📊-Button in kanprompt.html öffnet dispatch.html in neuem Tab/Fenster
6. [ ] Erneuter Klick auf 📊 fokussiert das bestehende Dispatch-Fenster (kein Duplikat)
7. [ ] kanprompt.html enthält keinen Dispatch-Overlay-Code mehr
8. [ ] Dispatch-Seite überlebt Browser-Refresh (localStorage-Queue bleibt erhalten)
9. [ ] Companion-Neustart: dispatch.html zeigt nach Reconnect korrekte Daten

---

# Session-Log

- **Datum:** 2026-03-21T00:05:00
- **Branch:** feature/dispatch-als-eigene-seite
- **Ergebnis:** Erfolgreich

## Zusammenfassung
Dispatch Manager aus kanprompt.html als eigenständige Seite (`dispatch.html`) extrahiert. Companion serviert die Seite unter `GET /dispatch`, neuer `GET /projects`-Endpoint liefert Projektliste. kanprompt.html um ~640 Zeilen reduziert, 📊-Button öffnet Dispatch in eigenem Fenster.

## Geänderte Dateien
- `dispatch.html` — Neue eigenständige Single-File-App mit Auftrags-Queue, Add-Dialog, Git-Status, SSE-Verbindung
- `companion/kanprompt-companion.js` — `GET /dispatch` (HTML-Serving) und `GET /projects` (Projektliste) hinzugefügt
- `kanprompt.html` — Dispatch-Overlay komplett entfernt (HTML, CSS, JS), 📊-Button auf `window.open` umgebaut, Version 0.19.1 → 0.20.0
- `CHANGELOG.md` — Eintrag für v0.20.0

## Abweichungen vom Prompt
- Projekt-Dropdown im Add-Dialog nutzt neuen `GET /projects`-Endpoint statt localStorage (da dispatch.html auf anderem Origin läuft)

## Offene Punkte
Keine.
