# CC Prompt Workflow — Einrichtungsanleitung

## Überblick

Der CC Prompt Workflow ist ein Kanban-gestütztes Aufgabenmanagementsystem für die Zusammenarbeit zwischen Claude.ai (Prompts erstellen, priorisieren, Board verwalten) und Claude Code (Prompts abarbeiten, Session-Logs schreiben).

### Kernkomponenten

| Komponente | Beschreibung |
|---|---|
| `doc/prompts/new/` | Prompts, die noch umgesetzt werden müssen |
| `doc/prompts/in-progress/` | Prompts, an denen CC gerade arbeitet |
| `doc/prompts/done/` | Abgeschlossene Prompts mit Session-Log |
| `doc/prompts/deleted/` | Entfernte Prompts (über Kanban-Board gelöscht) |
| `doc/prompts/backlog-priority.json` | Priorisierte Aufgabenliste (maschinenlesbar) |
| `doc/prompts/README.md` | Konventionen und Namensregeln |
| `doc/prompts/TEMPLATE.md` | Vorlage für neue Prompts |
| `CLAUDE.md` (Abschnitt) | Workflow-Anweisungen für Claude Code |

### Ablauf

```
Du (Claude.ai)                    CC (Claude Code)
──────────────                    ──────────────────
Prompt schreiben ──────→ new/
  (setzt "new" Zeitstempel)
Backlog priorisieren               
  ("Zeig mir das Kanban-Board"
   → Read-Only Viewer)
  ("Verschiebe X auf Platz Y"
   → Claude schreibt JSON)
                                  "Arbeite nächstes Item ab"
                                  ← liest backlog-priority.json
                                  ← zeigt Item, wartet auf Go
Du: "Ja"                          
                                  → verschiebt nach in-progress/
                                  → setzt "inProgress" Zeitstempel
                                  → implementiert
                                  → hängt Session-Log an
                                  → verschiebt nach done/
                                  → setzt "done" Zeitstempel
                                  → aktualisiert JSON (inkl. done-Array)
```

---

## A) Neues Repository einrichten

### Schritt 1: Setup-Script ausführen

Öffne PowerShell und führe aus:

```powershell
C:\Users\christian.mangold\.claude\cc-prompt-workflow\setup-prompt-workflow.ps1 `
    -TargetPath "C:\Users\christian.mangold\IdeaProjects\mein-neues-projekt"
```

Das erstellt folgende Struktur im Projekt:

```
mein-neues-projekt/
├── doc/
│   └── prompts/
│       ├── new/.gitkeep
│       ├── in-progress/.gitkeep
│       ├── done/.gitkeep
│       ├── deleted/.gitkeep
│       ├── backlog-priority.json   ← leere Backlog-Datei
│       ├── README.md               ← Konventionen
│       └── TEMPLATE.md             ← Prompt-Vorlage
└── CLAUDE-backlog-section.md       ← temporär, für Schritt 2
```

### Schritt 2: CLAUDE.md ergänzen

Öffne `CLAUDE-backlog-section.md` und kopiere den Inhalt in die `CLAUDE.md` deines Projekts (unter "Development Guidelines" oder ähnlich). Lösche danach die `CLAUDE-backlog-section.md` aus dem Projekt.

Falls noch keine `CLAUDE.md` existiert, erstelle eine mit mindestens diesem Inhalt:

```markdown
# CLAUDE.md

## Project Overview
(Kurzbeschreibung des Projekts)

## Development Guidelines

### CC-Prompt Workflow and Session Logging
(Inhalt aus CLAUDE-backlog-section.md hier einfügen)
```

### Schritt 3: Ersten Prompt erstellen

Kopiere `doc/prompts/TEMPLATE.md` und benenne sie nach der Konvention:

```
{typ}-{kurzbeschreibung}.md
```

Typische Prefixe: `fix-`, `feat-`, `cleanup-`, `ux-`, `gui-`, `phase{N}-`

Beispiel:
```powershell
Copy-Item doc\prompts\TEMPLATE.md doc\prompts\new\feat-user-authentication.md
```

### Schritt 4: Backlog-Eintrag hinzufügen

Ergänze `doc/prompts/backlog-priority.json`:

```json
{
  "$schema": "Backlog priority for CC prompts. Timestamps set when item enters phase.",
  "backlog": [
    {
      "id": "feat-user-authentication",
      "file": "feat-user-authentication.md",
      "title": "User Authentication implementieren",
      "blocked": false,
      "new": "2026-03-14"
    }
  ],
  "inProgress": [],
  "done": []
}
```

### Schritt 5: Committen

```bash
git add doc/prompts/ CLAUDE.md
git commit -m "Setup CC prompt workflow with Kanban backlog"
```

---

## B) Bestehendes Repository nachrüsten

### Situation 1: Noch kein `doc/prompts/` vorhanden

Führe das Setup-Script aus wie in Abschnitt A beschrieben. Es erstellt alle Dateien, ohne bestehende Projektdateien zu überschreiben.

### Situation 2: `doc/prompts/` existiert bereits (ohne Backlog-System)

Falls Du schon Prompts in `doc/prompts/{new,in-progress,done}/` hast, musst Du nur zwei Dateien hinzufügen:

#### 1. `backlog-priority.json` erstellen

Erstelle `doc/prompts/backlog-priority.json` mit den bestehenden Prompts in der gewünschten Reihenfolge:

```json
{
  "$schema": "Backlog priority for CC prompts. Timestamps set when item enters phase.",
  "backlog": [
    {
      "id": "mein-erster-prompt",
      "file": "mein-erster-prompt.md",
      "title": "Beschreibung des ersten Prompts",
      "blocked": false,
      "new": "2026-03-14"
    },
    {
      "id": "mein-zweiter-prompt",
      "file": "mein-zweiter-prompt.md",
      "title": "Beschreibung des zweiten Prompts",
      "blocked": true,
      "blockedBy": "Wartet auf externe Zulieferung",
      "new": "2026-03-14"
    }
  ],
  "inProgress": [
    {
      "id": "aktuell-in-arbeit",
      "file": "aktuell-in-arbeit.md",
      "title": "Prompt der gerade umgesetzt wird",
      "new": "2026-03-12",
      "inProgress": "2026-03-14"
    }
  ],
  "done": [
    {
      "id": "bereits-erledigt",
      "file": "bereits-erledigt.md",
      "title": "Ein fertiger Prompt",
      "new": "2026-03-10",
      "inProgress": "2026-03-11",
      "done": "2026-03-12"
    }
  ]
}
```

**Regeln:**
- `id` = Dateiname ohne `.md`
- `file` = vollständiger Dateiname
- `blocked: true` + `blockedBy` = Item wird im Board abgedimmt und von CC übersprungen
- Reihenfolge im `backlog`-Array = Priorität (Index 0 = höchste)
- Zeitstempel-Felder (`new`, `inProgress`, `done`, `deleted`): YYYY-MM-DD, werden gesetzt wenn ein Item in die jeweilige Phase wechselt
- `done`-Array enthält abgeschlossene Items (nicht nur im Filesystem, sondern auch in der JSON für die Board-Anzeige)

#### 2. CLAUDE.md ergänzen

Füge den Backlog-Abschnitt in die bestehende CLAUDE.md ein. Der Text liegt unter:

```
C:\Users\christian.mangold\.claude\cc-prompt-workflow\CLAUDE-backlog-section.md
```

#### 3. Optional: TEMPLATE.md und README.md

Falls noch nicht vorhanden, kopiere auch diese aus dem Scaffold:

```powershell
$scaffold = "C:\Users\christian.mangold\.claude\cc-prompt-workflow\scaffold"
Copy-Item "$scaffold\doc\prompts\TEMPLATE.md" "doc\prompts\TEMPLATE.md"
Copy-Item "$scaffold\doc\prompts\README.md" "doc\prompts\README.md"
```

---

## Kanban-Board verwenden

### Board aufrufen

Sage in einem Claude.ai-Chat (im Projekt-Kontext):

> *"Zeig mir das Kanban-Board"*

Claude führt das PowerShell-Script `generate-kanban-board.ps1` aus, das die
`backlog-priority.json` liest und ein Board als JSX-Artifact generiert.
Das Board zeigt drei Spalten: **Backlog**, **In Progress**, **Done**.

In der Done-Spalte werden heute abgeschlossene Items einzeln angezeigt,
ältere Items werden zusammengefasst.

### Board ist ein reiner Viewer

Das Board zeigt den aktuellen Stand — keine Interaktion im Artifact.
Alle Änderungen laufen über den Chat:

- *"Verschiebe X auf Platz Y"* — Priorität ändern
- *"Blocke X wegen Y"* / *"Entblocke X"* — Block-Status ändern
- *"Lösche X"* — Item nach `deleted/` verschieben
- *"Zeig mir das Kanban-Board"* — Board nach Änderungen neu generieren

Claude schreibt die aktualisierte `backlog-priority.json` auf die Platte
und bestätigt die Änderung.

---

## CC anweisen

### Nächstes Item abarbeiten

In einer Claude Code Session:

```
Arbeite das nächste Item aus dem Backlog ab.
```

CC wird:
1. `doc/prompts/backlog-priority.json` lesen
2. Das erste nicht-blockierte Item im `backlog`-Array finden
3. Dir das Item zeigen und auf Bestätigung warten
4. Nach "Ja": Den Prompt von `new/` nach `in-progress/` verschieben, das Item von `backlog` nach `inProgress` in der JSON verschieben, `"inProgress": "YYYY-MM-DD"` mit heutigem Datum setzen, und mit der Umsetzung beginnen
5. Nach Abschluss: Session-Log anhängen, Prompt nach `done/` verschieben, das Item von `inProgress` ins `done`-Array in der JSON verschieben, `"done": "YYYY-MM-DD"` mit heutigem Datum setzen

### Bestimmtes Item abarbeiten

```
Arbeite "feat-user-authentication" aus dem Backlog ab.
```

CC findet das Item anhand der ID und verfährt wie oben.

---

## Prompt-Vorlage

Neue Prompts basieren auf `doc/prompts/TEMPLATE.md`:

```markdown
# [Titel der Aufgabe]

## Problem / Motivation
[Was soll gelöst werden?]

## Betroffene Dateien
- `pfad/zur/datei.ext` — [Kurzbeschreibung]

## Ist-Zustand
[Aktueller Stand]

## Soll-Zustand
[Gewünschter Endzustand, ggf. mit Code-Beispielen]

## Constraints
- [Was darf NICHT geändert werden?]

## Verifikation
1. [Wie wird geprüft?]

## Session-Log — Pflichtaufgabe nach Abschluss
(Platzhalter-Abschnitt — wird von CC durch das fertige Log ersetzt)
```

---

## Zusammenfassung der Dateipfade

| Datei | Zweck | Im Git? |
|---|---|---|
| `doc/prompts/backlog-priority.json` | Priorisierte Aufgabenliste | ✅ Ja |
| `doc/prompts/new/*.md` | Offene Prompts | ✅ Ja |
| `doc/prompts/in-progress/*.md` | Aktive Prompts | ✅ Ja |
| `doc/prompts/done/*.md` | Erledigte Prompts | ✅ Ja |
| `doc/prompts/deleted/*.md` | Entfernte Prompts | ✅ Ja |
| `doc/prompts/README.md` | Konventionen | ✅ Ja |
| `doc/prompts/TEMPLATE.md` | Prompt-Vorlage | ✅ Ja |
| `CLAUDE.md` | CC-Anweisungen | ⚠️ Projektabhängig |

### Template-Verzeichnis (global, auf der lokalen Maschine)

Das Template-Verzeichnis enthält die Kopiervorlage, aus der das Setup-Script
die Projektstruktur erzeugt:

```
C:\Users\christian.mangold\.claude\cc-prompt-workflow\
├── GUIDE.md                        ← diese Anleitung
├── README.md                       ← Kurzübersicht
├── CLAUDE-backlog-section.md       ← Text für CLAUDE.md
├── setup-prompt-workflow.ps1       ← Setup-Script
├── generate-kanban-board.ps1       ← Board-Generator (liest JSON + Template → JSX)
├── kanban-board-template.jsx       ← JSX-Template für das Kanban-Board (Read-Only)
└── scaffold/                       ← Kopiervorlage (wird ins Projekt kopiert)
    └── doc/prompts/
        ├── new/.gitkeep
        ├── in-progress/.gitkeep
        ├── done/.gitkeep
        ├── deleted/.gitkeep
        ├── backlog-priority.json
        ├── README.md
        └── TEMPLATE.md
```
