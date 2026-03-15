# Workflow-Doku auf ISO-Timestamps mit Uhrzeit aktualisieren

## Problem / Motivation

Seit v0.7.0 verwendet KanPrompt ISO-Timestamps mit Uhrzeit (`YYYY-MM-DDTHH:MM:SS`). Die Workflow-Dokumentation referenziert aber noch das alte Format `YYYY-MM-DD`. CC und andere Tools lesen diese Doku und würden das falsche Format verwenden.

**Auch betrifft:** Der Scaffold-Prompt (`scaffold-und-dort-liegende-readmes-muessen-aktualisiert-werd`) wurde als obsolet geschlossen. Die verbleibenden Doku-Updates sind in diesem Ticket zusammengeführt.

## Betroffene Dateien

### 1. `workflow/CLAUDE-backlog-section.md`

4 Stellen mit `YYYY-MM-DD` → `YYYY-MM-DDTHH:MM:SS`:

**Zeile 17** (JSON-Beschreibung):
```
timestamp fields (`new`, `inProgress`, `done`) in YYYY-MM-DD format.
```
Ändern zu:
```
timestamp fields (`new`, `inProgress`, `done`) in YYYY-MM-DDTHH:MM:SS format (ISO with time-of-day).
```

**Zeile 30** (inProgress setzen):
```
   - Set `"inProgress": "YYYY-MM-DD"` with today's date
```
Ändern zu:
```
   - Set `"inProgress": "YYYY-MM-DDTHH:MM:SS"` with current date and time
```

**Zeile 36** (done setzen):
```
   - Set `"done": "YYYY-MM-DD"` with today's date
```
Ändern zu:
```
   - Set `"done": "YYYY-MM-DDTHH:MM:SS"` with current date and time
```

**Zeile 73** (Session-Log Datum):
```
- **Datum:** (today's date, YYYY-MM-DD)
```
Ändern zu:
```
- **Datum:** (today's date, YYYY-MM-DDTHH:MM:SS)
```

### 2. `workflow/scaffold/doc/prompts/README.md`

2 Stellen:

**Zeile 43** (Session-Log Template):
```
- **Datum:** (heutiges Datum im Format YYYY-MM-DD)
```
Ändern zu:
```
- **Datum:** (heutiges Datum im Format YYYY-MM-DDTHH:MM:SS)
```

**Zeile 85** (JSON-Felder-Beschreibung):
```
- `new` — Datum (YYYY-MM-DD) wann der Prompt erstellt wurde
```
Ändern zu:
```
- `new` — Timestamp (YYYY-MM-DDTHH:MM:SS) wann der Prompt erstellt wurde
```

### 3. `workflow/scaffold/doc/prompts/TEMPLATE.md`

1 Stelle:

**Zeile 45** (Session-Log Template):
```
- **Datum:** (heutiges Datum im Format YYYY-MM-DD)
```
Ändern zu:
```
- **Datum:** (heutiges Datum im Format YYYY-MM-DDTHH:MM:SS)
```

### 4. `workflow/README.md`

Ergänzung im Abschnitt "Setup für ein neues Projekt": Hinweis auf `.kanprompt-version.json` einfügen.

Aktuell Schritt 2:
```
2. Kopiere den Inhalt von `CLAUDE-backlog-section.md` in die `CLAUDE.md` des Projekts
```

Neuen Schritt 3 einfügen (bisheriger Schritt 3 wird 4):
```
3. `.kanprompt-version.json` liegt schon im Scaffold — prüfen ob Schema-Version aktuell ist
```

## Nicht ändern

- `workflow/schema.json` — enthält schon `YYYY-MM-DDTHH:MM:SS` (korrekt)
- `workflow/scaffold/doc/prompts/backlog-priority.json` — wurde schon durch Schema-Versioning aktualisiert
- `CLAUDE.md` im KanPrompt-Repo-Root — enthält schon `YYYY-MM-DDTHH:MM:SS`
- Alle Dateien unter `doc/prompts/` (Projektdaten)
- `kanprompt.html`, `companion/`, `install/`

## Constraints

- Nur Dokumentation — keine funktionale Code-Änderung
- Alte Date-Only-Werte (`2026-03-14`) in bestehenden Done-Prompts nicht anfassen — die sind rückwärtskompatibel

## Verifikation

1. In allen Dateien unter `workflow/` nach `YYYY-MM-DD` suchen — nur als Substring von `YYYY-MM-DDTHH:MM:SS` erlaubt, nie allein stehend
2. `workflow/CLAUDE-backlog-section.md` enthält kein `YYYY-MM-DD` ohne `T` dahinter
3. `workflow/scaffold/doc/prompts/README.md` enthält kein `YYYY-MM-DD` ohne `T` dahinter
4. `workflow/scaffold/doc/prompts/TEMPLATE.md` enthält kein `YYYY-MM-DD` ohne `T` dahinter
5. `workflow/README.md` erwähnt `.kanprompt-version.json`

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
