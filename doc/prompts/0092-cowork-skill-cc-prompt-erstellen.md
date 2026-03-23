# Cowork-Skill: CC-Prompt-Karte erstellen

## Problem / Motivation

Das Erstellen einer CC-Prompt-Karte in Cowork ist fehleranfällig: Man muss die nächste Nummer kennen, den Dateinamen korrekt zusammenbauen, die Datei anlegen, in der Registry registrieren und verifizieren. Bei manueller Durchführung kommt es zu Nummern-Mismatches (Dateiprefix ≠ Registry-Num).

Ziel: Ein Cowork-Skill, der den gesamten Prozess führt — von der Anforderungsaufnahme über die Erstellung des Prompt-Inhalts bis zur Registrierung via `POST /api/projects/:id/create-card`.

**Abhängigkeit**: Setzt Karte #91 (`create-card`-Endpoint) voraus.

## Betroffene Dateien

- Neuer Skill als Cowork-Plugin oder lokaler Skill
- Kein bestehender Code wird geändert

## Ist-Zustand

- Kein geführter Workflow für Prompt-Erstellung in Cowork
- Claude muss den Companion-API-Workflow manuell kennen
- Fehlerquellen: falsche Nummer, Dateiname-Mismatch, fehlende Registry-Registrierung, vergessene Verifikation

## Soll-Zustand

### Skill-Trigger

Der Skill soll triggern bei:
- "Erstelle CC-Prompt", "CC-Prompt erstellen", "neue Prompt-Karte"
- "Erstelle Prompt für ...", "Schreib einen Prompt für ..."
- "Neuer Auftrag für KanPrompt / erju_wp27 / ..."

### Skill-Ablauf

#### Phase 0: Projektzugriff sicherstellen

Der Skill braucht Zugriff auf den Projektcode, um betroffene Dateien zu finden, den Ist-Zustand zu analysieren und Code-Referenzen für den Prompt zu liefern.

**Projektpfad ermitteln**: Per `GET /api/projects` die bekannten Projekte mit ihren Pfaden laden. Der User wählt das Projekt (oder es ergibt sich aus dem Gespräch).

**Dateizugriff via Desktop Commander**: Da die Projektordner typischerweise außerhalb des Home-Verzeichnisses liegen (z.B. `C:\git\local\...`) und Cowork nur Home-Ordner mounten kann, erfolgt der Dateizugriff über Desktop Commander:
- **Code-Suche**: `mcp__Desktop_Commander__start_search` (content + files)
- **Dateien lesen**: `mcp__Desktop_Commander__read_file` oder `mcp__Windows-MCP__FileSystem` (mode: read)
- **Verzeichnisse listen**: `mcp__Desktop_Commander__list_directory`

#### Phase 1: Kontext sammeln

1. **Projekt bestimmen**: Falls nicht aus dem Gespräch klar → User fragen (Dropdown der bekannten Projekte via `GET /api/projects`)
2. **Anforderungen aufnehmen**: Was soll geändert werden? Der User beschreibt das Feature/den Bug im Gespräch.
3. **Betroffene Dateien identifizieren**: Claude durchsucht den gemounteten Projektcode (Grep, Read), findet die relevanten Stellen und analysiert den aktuellen Code
4. **Kartentyp bestimmen**: `feature`, `bugfix`, oder `release`

#### Phase 2: Prompt-Inhalt generieren

Claude baut den Markdown-Inhalt nach dem Standard-Template:

```markdown
# {Titel}

## Problem / Motivation
{Warum ist diese Änderung nötig?}

## Betroffene Dateien
{Welche Dateien werden geändert? Mit kurzer Beschreibung was sich ändert}

## Ist-Zustand
{Wie verhält sich das System aktuell?}

## Soll-Zustand
{Wie soll es sich danach verhalten? Detaillierte Beschreibung mit Code-Beispielen wo sinnvoll}

## Constraints
{Randbedingungen, Abwärtskompatibilität, was NICHT geändert werden soll}

## Verifikation
{Nummerierte Checkliste mit konkreten Testfällen}

---

# Session-Log — Pflichtaufgabe nach Abschluss
```

**Qualitätskriterien für den Prompt-Inhalt:**
- Ist/Soll-Zustand müssen konkret sein (Code-Referenzen, Funktionsnamen)
- Verifikation muss prüfbare Aussagen enthalten (keine vagen "funktioniert korrekt"-Punkte)
- Betroffene Dateien mit Pfad relativ zum Projekt-Root
- Falls Code-Änderungen klar sind: Code-Snippets im Soll-Zustand zeigen

#### Phase 3: Review mit User

- Generierten Prompt-Inhalt dem User zeigen
- Feedback einholen und einarbeiten
- Erst nach User-Bestätigung weiter

#### Phase 4: Karte erstellen

Ein einzelner API-Call:

```
POST /api/projects/{projektId}/create-card
{
  "title": "...",
  "type": "feature|bugfix|release",
  "content": "...kompletter Markdown-Inhalt..."
}
```

#### Phase 5: Verifikation

Response prüfen:
- `action === "created"` ✓
- `card.file` beginnt mit der gleichen Nummer wie `card.num` (zero-padded) ✓
- `card.status === "new"` ✓

Optional: `GET /api/projects/{projektId}/reconcile` → `inSync: true`

Dem User die erstellte Karte melden: Nummer, Titel, Dateiname.

### Companion-Zugang aus Cowork

Der Skill läuft im Cowork-Linux-Container und muss den Companion auf dem Windows-Rechner erreichen. Dafür wird Desktop Commander verwendet:

1. Temporäre .js-Datei schreiben (via `mcp__Windows-MCP__FileSystem` oder `mcp__Desktop_Commander__write_file`)
2. Mit `mcp__Desktop_Commander__start_process` und `node` ausführen
3. Ergebnis aus stdout parsen
4. Temp-Datei löschen

**Standardpfad für Temp-Dateien**: `C:\Users\christian.mangold\_tmp_kanprompt_api.js`
**Companion-URL**: `http://127.0.0.1:9177`

### Skill-Struktur

```
cc-prompt-erstellen/
├── SKILL.md                    # Skill-Anleitung (dieser Prompt als Basis)
└── references/
    └── prompt-template.md      # Standard-Template für Prompt-Karten
```

## Constraints

- Skill darf NUR über `create-card`-API arbeiten — keine direkte Dateimanipulation auf dem Windows-Rechner (außer Temp-Datei für API-Calls)
- Prompt-Inhalt MUSS dem User gezeigt und bestätigt werden, bevor er erstellt wird
- Skill muss mit beliebigen Projekten funktionieren (nicht nur KanPrompt)
- Kein CHANGELOG-Eintrag nötig (Skill ist kein KanPrompt-Code)

## Verifikation

1. [ ] Skill triggert bei "erstelle CC-Prompt für KanPrompt"
2. [ ] Skill ermittelt Projektpfad aus Registry und greift per Desktop Commander auf den Code zu
3. [ ] Skill durchsucht den Projektcode für betroffene Dateien und Ist-Zustand
4. [ ] Skill generiert vollständigen Prompt-Inhalt nach Template mit konkreten Code-Referenzen
5. [ ] User kann Inhalt reviewen und Feedback geben
6. [ ] Nach Bestätigung: ein `create-card`-API-Call
7. [ ] Response zeigt: Num == Dateiprefix, status=new
8. [ ] `reconcile` zeigt `inSync: true`
9. [ ] Mehrere Karten hintereinander → aufsteigende Nummern
10. [ ] Funktioniert für KanPrompt UND erju_wp27

---

# Session-Log — Pflichtaufgabe nach Abschluss
