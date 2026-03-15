# CC-Prompts — Verzeichnisstruktur und Konventionen

## Verzeichnisstruktur

```
doc/prompts/
├── new/            ← Prompts, die noch umzusetzen sind
├── in-progress/    ← Prompts, die gerade in Bearbeitung sind
├── done/           ← Abgeschlossene Prompts
├── deleted/        ← Entfernte Prompts (über Kanban-Board gelöscht)
├── backlog-priority.json  ← Priorisierte Aufgabenliste (maschinenlesbar)
└── README.md       ← Diese Datei
```

## Workflow

1. **Neuen Prompt erstellen** → Datei in `new/` ablegen, Eintrag in `backlog-priority.json` ergänzen
2. **Umsetzung starten** → Datei von `new/` nach `in-progress/` verschieben, JSON aktualisieren
3. **Umsetzung abschließen** → Session-Log anhängen, Datei nach `done/`, JSON aktualisieren

## Prompt-Aufbau (zweiteilig)

### Teil 1: Prompt (vor der Umsetzung geschrieben)

Der eigentliche Auftrag — Problembeschreibung, Lösungsstrategie, betroffene Dateien, Constraints, Verifikation.

### Teil 2: Session-Log (nach der Umsetzung angehängt)

**Trennformat — als letzten Abschnitt in jeden Prompt einfügen:**

```markdown
## Session-Log — Pflichtaufgabe nach Abschluss

Nachdem alle Änderungen umgesetzt und verifiziert sind, ist als **letzter Schritt** folgendes zu tun:

Öffne diese Prompt-Datei und hänge am Ende ein ausgefülltes Session-Log an.
Ersetze dabei diesen gesamten Abschnitt durch das fertige Log:

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

(Falls die Umsetzung vom Prompt abwich: Was und warum? Falls keine: „Keine.")

## Offene Punkte

(Falls etwas offen geblieben ist. Falls nichts: „Keine.")
```

## Namenskonvention

```
{typ}-{kurzbeschreibung}.md
```

Typische Prefixe: `fix-`, `feat-`, `cleanup-`, `ux-`, `gui-`, `phase{N}-`

## Backlog-Datei

Die Datei `backlog-priority.json` ist die maschinenlesbare Aufgabenliste.
CC (Claude Code) liest diese Datei, um das nächste zu bearbeitende Item zu bestimmen.
Das Kanban-Board in Claude.ai visualisiert diese Datei.

### JSON-Struktur

Jeder Eintrag hat folgende Felder:
- `id` — Dateiname ohne `.md`
- `file` — vollständiger Dateiname
- `title` — Beschreibung
- `blocked` / `blockedBy` — nur im Backlog, CC überspringt blockierte Items
- `new` — Timestamp (YYYY-MM-DDTHH:MM:SS) wann der Prompt erstellt wurde
- `inProgress` — Datum wann CC mit der Bearbeitung begonnen hat
- `done` — Datum wann abgeschlossen
- `deleted` — Datum wann gelöscht

Die JSON enthält drei Arrays: `backlog`, `inProgress`, `done`.
