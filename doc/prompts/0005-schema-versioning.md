# Schema-Versionierung einführen

## Problem / Motivation

KanPrompt hat zwei unabhängige Achsen:

1. **App-Version** — `kanprompt.html` (hat schon `const VERSION`).
2. **Schema-Version** — die Konventionen in jedem Projekt-Repo: JSON-Format, Ordnerstruktur, Markdown-Templates.

Aktuell gibt es keine Möglichkeit festzustellen, auf welchem Schema-Stand ein Projekt-Repo ist. Wenn sich das JSON-Format oder die Ordnerstruktur ändert, weiß kein Script ob ein Projekt-Repo schon aktualisiert wurde.

**Voraussetzung für:** `one-step-deploy` (Ein-Schritt-Update braucht Versionswissen).

## Betroffene Dateien

### Neu erstellen

- **`workflow/schema.json`** — Quelle der Wahrheit für die aktuelle Schema-Version
- **`.kanprompt-version.json`** (im KanPrompt-Repo-Root) — Dogfooding: KanPrompt selbst als erstes Projekt
- **`workflow/scaffold/.kanprompt-version.json`** — Template für neue Projekte

### Aktualisieren

- **`workflow/scaffold/doc/prompts/backlog-priority.json`** — Timestamp-Format von `YYYY-MM-DD` auf `YYYY-MM-DDTHH:MM:SS` korrigieren (ist schon so im echten Repo, aber das Scaffold-Template hinkt hinterher)
- **`CLAUDE.md`** — Schema-Versionierung dokumentieren
- **`install/update.ps1`** — Versionsvergleich einbauen (nur Anzeige, keine Migration)

## Soll-Zustand

### 1. `workflow/schema.json`

```json
{
  "currentVersion": "1.0.0",
  "description": "KanPrompt Workflow Schema — definiert JSON-Format, Ordnerstruktur und Templates",
  "versions": {
    "1.0.0": {
      "released": "2026-03-15",
      "json": {
        "fields": {
          "backlog[]": ["id", "file", "title", "new"],
          "inProgress[]": ["id", "file", "title", "new", "inProgress"],
          "done[]": ["id", "file", "title", "new", "inProgress", "done"]
        },
        "timestampFormat": "YYYY-MM-DDTHH:MM:SS"
      },
      "folders": ["doc/prompts/new/", "doc/prompts/in-progress/", "doc/prompts/done/", "doc/prompts/deleted/"],
      "files": ["doc/prompts/backlog-priority.json", "doc/prompts/README.md", "doc/prompts/TEMPLATE.md"]
    }
  }
}
```

### 2. `.kanprompt-version.json` (pro Projekt-Repo, im Root)

```json
{
  "schema": "1.0.0",
  "app": "0.7.2",
  "updatedAt": "2026-03-15T15:30:00"
}
```

Das `app`-Feld enthält die Version der zuletzt deployed `kanprompt.html`. Das `updatedAt`-Feld den Zeitpunkt des letzten Updates.

### 3. `workflow/scaffold/.kanprompt-version.json`

Identisch zur obigen Struktur, aber mit Platzhalter-Werten:

```json
{
  "schema": "1.0.0",
  "app": "0.0.0",
  "updatedAt": ""
}
```

### 4. `workflow/scaffold/doc/prompts/backlog-priority.json`

Timestamp-Beschreibung im `$schema`-Feld korrigieren:

Aktuell: `"Format: YYYY-MM-DD."`
Neu: `"Timestamps (new/inProgress/done/deleted) are set when an item enters that phase. Format: YYYY-MM-DDTHH:MM:SS (ISO with time-of-day)."`

### 5. `CLAUDE.md` — Neuen Abschnitt ergänzen

Nach dem Abschnitt "Datenmodell" folgenden Block einfügen:

```
### Schema-Versionierung

`workflow/schema.json` ist die Quelle der Wahrheit für das aktuelle Schema (JSON-Felder, Ordnerstruktur, Templates). Jedes Projekt-Repo hat eine `.kanprompt-version.json` im Root, die angibt auf welcher Schema- und App-Version es steht. Das Update-Script liest diese Datei und zeigt an ob Updates verfügbar sind.
```

### 6. `install/update.ps1` — Versionsvergleich ergänzen

Nach dem bestehenden Versions-Output (`Write-Host "KanPrompt Update -> v$ver"`) folgende Logik einbauen:

```powershell
# Check schema version
$schemaFile = "$RepoRoot\workflow\schema.json"
$versionFile = "$RepoRoot\.kanprompt-version.json"

if ((Test-Path $schemaFile) -and (Test-Path $versionFile)) {
    $schema = Get-Content $schemaFile -Raw | ConvertFrom-Json
    $projVersion = Get-Content $versionFile -Raw | ConvertFrom-Json
    
    $currentSchema = $schema.currentVersion
    $projectSchema = $projVersion.schema
    
    if ($currentSchema -ne $projectSchema) {
        Write-Host "  Schema: $projectSchema -> $currentSchema (migration needed)" -ForegroundColor Yellow
    } else {
        Write-Host "  Schema: $projectSchema (up to date)" -ForegroundColor Green
    }
}
```

Nach dem erfolgreichen Copy-Block die `.kanprompt-version.json` aktualisieren:

```powershell
# Update version file
if (Test-Path $versionFile) {
    $projVersion = Get-Content $versionFile -Raw | ConvertFrom-Json
    $projVersion.app = $ver
    $projVersion.updatedAt = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
    $projVersion | ConvertTo-Json -Depth 10 | Set-Content $versionFile -Encoding UTF8
}
```

## Constraints

- Keine Migrations-Logik — nur Erkennung und Anzeige
- `update.ps1` muss weiterhin funktionieren wenn `.kanprompt-version.json` nicht existiert (Fallback: wie bisher)
- Schema-Version ist unabhängig von App-Version
- Bestehende Projekt-Daten (Prompt-Inhalte in JSON und Markdown) dürfen nicht verändert werden

## Nicht ändern

- Inhalt von `doc/prompts/backlog-priority.json` (nur das Scaffold-Template anpassen)
- Bestehende Prompt-Karten in `doc/prompts/new/`, `done/` etc.
- `kanprompt.html` — die App selbst ist nicht betroffen
- `companion/` — nicht betroffen

## Verifikation

1. `workflow/schema.json` existiert und enthält Version `1.0.0` mit korrekter Felddefinition
2. `.kanprompt-version.json` existiert im KanPrompt-Repo-Root mit `"schema": "1.0.0"`
3. `workflow/scaffold/.kanprompt-version.json` existiert als Template
4. `workflow/scaffold/doc/prompts/backlog-priority.json` hat das aktualisierte Timestamp-Format in der Beschreibung
5. `CLAUDE.md` enthält den neuen Abschnitt "Schema-Versionierung"
6. `install/update.ps1` zeigt Schema-Version beim Update an
7. `install/update.ps1` funktioniert weiterhin korrekt wenn `.kanprompt-version.json` fehlt

---

# Session-Log

- **Datum:** 2026-03-15
- **Branch:** master
- **Ergebnis:** Erfolgreich

## Zusammenfassung

Schema-Versionierung eingeführt: `workflow/schema.json` als zentrale Schema-Definition (v1.0.0), `.kanprompt-version.json` im Repo-Root (Dogfooding) und als Scaffold-Template, Timestamp-Format im Scaffold korrigiert, CLAUDE.md ergänzt und `install/update.ps1` um Versionsvergleich und automatische App-Version-Aktualisierung erweitert.

## Geänderte Dateien

- `workflow/schema.json` — Neu: Schema-Definition mit Version 1.0.0 (JSON-Felder, Ordnerstruktur, Dateien)
- `.kanprompt-version.json` — Neu: Versionsdatei für KanPrompt-Repo (Schema 1.0.0, App 0.7.2)
- `workflow/scaffold/.kanprompt-version.json` — Neu: Template mit Platzhalter-Werten für neue Projekte
- `workflow/scaffold/doc/prompts/backlog-priority.json` — $schema-Feld auf ISO-Timestamp-Format aktualisiert
- `CLAUDE.md` — Abschnitt "Schema-Versionierung" nach "Datenmodell" eingefügt
- `install/update.ps1` — Schema-Versionsvergleich vor Copy-Block, App-Version-Update nach Copy-Block

## Abweichungen vom Prompt

Keine.

## Offene Punkte

Keine.
