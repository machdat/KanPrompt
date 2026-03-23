# KanPrompt-Repo nach Home-Verzeichnis verschieben

## Problem / Motivation

Cowork kann nur Ordner innerhalb des Home-Verzeichnisses (`C:\Users\christian.mangold\`) mounten. Das KanPrompt-Repo liegt aktuell unter `C:\git\local\KanPrompt` — außerhalb von Home. Dadurch muss der Cowork-Skill (Karte #92) den Umweg über Desktop Commander nehmen statt direkt im gemounteten Code zu arbeiten.

Ziel: Repo nach `C:\Users\christian.mangold\git\KanPrompt` verschieben, damit Cowork es direkt mounten kann.

## Betroffene Dateien

- `companion/projects-registry.json` — `projectPath` für KanPrompt-Projekt
- `CLAUDE.md` — Pfadreferenzen zum Projekt
- Companion-Server Startskripte (falls der Pfad dort hardcoded ist)

## Ist-Zustand

- Repo: `C:\git\local\KanPrompt`
- Registry `projectPath`: `C:\\git\\local\\KanPrompt`
- Cowork Mount: nicht möglich (außerhalb Home)
- Companion Server: startet aus dem Repo-Pfad

## Soll-Zustand

- Repo: `C:\Users\christian.mangold\git\KanPrompt`
- Registry `projectPath`: `C:\\Users\\christian.mangold\\git\\KanPrompt`
- Cowork Mount: funktioniert
- Companion Server: startet aus dem neuen Pfad

### Umzugs-Schritte

1. **Companion Server stoppen** (Ctrl+C im Terminal)
2. **Verzeichnis `C:\Users\christian.mangold\git\` anlegen** (falls nicht vorhanden)
3. **Repo verschieben**: `move C:\git\local\KanPrompt C:\Users\christian.mangold\git\KanPrompt`
4. **Registry aktualisieren**: In `companion/projects-registry.json` den `projectPath` von `C:\\git\\local\\KanPrompt` auf `C:\\Users\\christian.mangold\\git\\KanPrompt` ändern
5. **CLAUDE.md prüfen und aktualisieren**: Alle Pfadreferenzen anpassen
6. **Companion Server neu starten** aus dem neuen Pfad
7. **Cowork-Mount testen**: `request_cowork_directory` mit `C:\Users\christian.mangold\git\KanPrompt`

### Was NICHT angepasst werden muss

- **Git Remote** — URL bleibt gleich, Git kennt nur relative Pfade innerhalb des Repos
- **Alte Prompt-Karten** (0055, 0067, 0068) — enthalten Beispielpfade in bereits erledigten Karten, rein kosmetisch
- **`.claude/projects/`-Ordner** — historische CC-Session-Logs mit Pfad im Ordnernamen, nicht editierbar und nicht funktionsrelevant
- **Dispatch-Queue im Browser** — `localStorage` enthält ggf. alte `project.path`-Werte. Bestehende Queue-Einträge mit altem Pfad manuell entfernen oder durch Neuanlage ersetzen.

## Constraints

- Companion muss vor dem Verschieben gestoppt werden
- Nach dem Verschieben: Companion aus neuem Pfad starten
- Kein `git clone` — das bestehende Repo wird verschoben, nicht geklont
- Falls Worktrees existieren: diese befinden sich unter `{project}-worktrees/` und müssen ggf. auch verschoben werden (oder per `git worktree repair` repariert werden)

## Verifikation

1. [ ] `C:\Users\christian.mangold\git\KanPrompt` existiert und enthält alle Dateien
2. [ ] `C:\git\local\KanPrompt` existiert nicht mehr
3. [ ] Companion startet aus neuem Pfad ohne Fehler
4. [ ] `GET /api/projects/KanPrompt` → `projectPath` zeigt auf neuen Pfad
5. [ ] `GET /api/projects/KanPrompt/reconcile` → `inSync: true`
6. [ ] Cowork: `request_cowork_directory` mit `C:\Users\christian.mangold\git\KanPrompt` → Mount erfolgreich
7. [ ] KanPrompt im Browser öffnen → funktioniert (F5 Refresh)
8. [ ] Dispatch: neuen Auftrag hinzufügen → Projekt wird korrekt erkannt
9. [ ] `git status` im neuen Pfad → clean, Remote korrekt

---

# Session-Log — Pflichtaufgabe nach Abschluss
