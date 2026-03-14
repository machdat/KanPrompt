# KanPrompt — Prompts

Kanban-gesteuerte Aufgabenverwaltung für das KanPrompt-Projekt selbst.

## Verzeichnisstruktur

```
doc/prompts/
├── backlog-priority.json    # Single Source of Truth (Reihenfolge + Timestamps)
├── new/                     # Backlog — offene Aufgaben
├── in-progress/             # Aktuell in Arbeit
├── done/                    # Abgeschlossen (mit Session-Log)
└── deleted/                 # Verworfen
```

## Workflow

1. **Neue Aufgabe:** Prompt-Datei in `new/` anlegen, Eintrag in JSON ergänzen
2. **Starten:** Datei nach `in-progress/` verschieben, `inProgress`-Timestamp setzen
3. **Abschließen:** Datei nach `done/` verschieben, `done`-Timestamp setzen, Session-Log anhängen
4. **Verwerfen:** Datei nach `deleted/`, aus JSON entfernen

## Timestamp-Format

ISO mit Uhrzeit: `2026-03-14T16:45:00`

## KanPrompt öffnen

```
file:///C:/Users/christian.mangold/.kanprompt/kanprompt.html
```

Dann den KanPrompt-Projekt-Ordner (`C:\git\local\KanPrompt`) auswählen.
