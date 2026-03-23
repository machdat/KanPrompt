# CC-Prompts — Verzeichnisstruktur und Konventionen

## Verzeichnisstruktur

```
doc/prompts/
├── new/            ← Prompts, die noch umzusetzen sind
├── in-progress/    ← Prompts, die gerade in Bearbeitung sind
├── done/           ← Abgeschlossene Prompts
├── deleted/        ← Entfernte Prompts (über Kanban-Board gelöscht)
├── backlog-priority.json  ← Lokaler Spiegel der Companion-Daten (Backup)
└── README.md       ← Diese Datei
```

## Workflow

1. **Neuen Prompt erstellen** → Karte über KanPrompt-UI oder Companion-API anlegen
2. **Umsetzung starten** → Karte über Companion-API nach `inProgress` verschieben
3. **Umsetzung abschließen** → Session-Log anhängen, Karte über Companion-API nach `done` verschieben

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

Die **Single Source of Truth** für alle Karten- und Projektdaten ist der **Companion-Server** (Projects Registry). Die lokale `backlog-priority.json` ist ein vom Companion geschriebener **Spiegel/Backup** — nicht die autoritative Quelle. CC (Claude Code) liest Kartendaten über die Companion-API (`GET /api/projects/:id`).

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
