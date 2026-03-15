# Deploy vereinfachen: Ein-Schritt-Update

## Problem / Motivation

Aktuell sind nach Änderungen im Repo zwei Schritte nötig:
1. `git pull`
2. `install\update.ps1`

Das ist fehleranfällig — man vergisst den zweiten Schritt und wundert sich, warum die Änderung nicht sichtbar ist. Ziel: Ein einziger Befehl erledigt beides.

## Betroffene Dateien

- `install\update.ps1` — `git pull` einbauen (vor dem Copy-Block)

## Nicht ändern

- `kanprompt.html`
- `companion/`
- `workflow/`
- `doc/prompts/` (keine Inhalte)
- `install\install.ps1`
- `.kanprompt-version.json` — wird weiterhin vom bestehenden Code am Ende aktualisiert, keine Änderung nötig

## Ist-Zustand

`update.ps1` (aktueller Stand):
1. Auto-detect Repo-Root
2. Version aus `kanprompt.html` lesen
3. Schema-Versionsvergleich anzeigen
4. Dateien nach `~/.kanprompt/` kopieren
5. `.kanprompt-version.json` aktualisieren

Kein `git pull` — der Benutzer muss das separat machen.

## Soll-Zustand

`update.ps1` bekommt einen neuen Block **direkt nach dem Repo-Root-Check** (nach `exit 1`) und **vor** dem Versions-Read (`$ver = Select-String ...`). Dieser Block macht folgendes:

```powershell
# Git pull (if in a git repo with remote)
if (Test-Path "$RepoRoot\.git") {
    $remotes = git -C $RepoRoot remote 2>$null
    if ($remotes) {
        Write-Host "  git pull..." -ForegroundColor Gray -NoNewline
        $pullResult = git -C $RepoRoot pull 2>&1
        $pullExit = $LASTEXITCODE
        if ($pullExit -eq 0) {
            $pullText = ($pullResult | Out-String).Trim()
            if ($pullText -eq "Already up to date.") {
                Write-Host " already up to date" -ForegroundColor Gray
            } else {
                Write-Host " done" -ForegroundColor Green
            }
        } else {
            Write-Host " failed (continuing with local files)" -ForegroundColor Yellow
            Write-Host "  $pullResult" -ForegroundColor Yellow
        }
    }
}
```

### Verhalten

- **Im Git-Repo mit Remote:** `git pull` wird ausgeführt. Bei Erfolg → weiter. Bei Fehler (kein Netzwerk, Merge-Konflikt) → Warnung, aber Script läuft mit lokalen Dateien weiter.
- **Im Git-Repo ohne Remote:** Kein Pull-Versuch (z.B. frisch initialisiertes Repo ohne `origin`).
- **Kein Git-Repo:** Block wird komplett übersprungen (z.B. standalone-Kopie in `~/.kanprompt/`).
- **Git nicht installiert:** `git` Befehl schlägt fehl → `$remotes` ist leer → Block wird übersprungen.

### Einfügepunkt im bestehenden Code

Der Block kommt **nach** dieser Zeile:
```
    exit 1
}
```

Und **vor** dieser Zeile:
```
# Get version from repo
```

Dazwischen eine Leerzeile, dann der neue Block, dann eine Leerzeile.

## Constraints

- Nur `update.ps1` ändern — kein neues Script
- Kein bestehender Code darf verändert werden — der neue Block wird eingefügt, nichts wird umgeschrieben
- Bei `git pull`-Fehler: Script läuft trotzdem weiter (kein `exit`)
- Kein Admin-Recht nötig
- Keine Schema-Migration (wurde bewusst auf später verschoben)

## Verifikation

1. Im KanPrompt-Repo `install\update.ps1` ausführen → zeigt `git pull...` gefolgt von `already up to date` oder `done`
2. WLAN aus → `install\update.ps1` ausführen → zeigt `failed (continuing with local files)`, kopiert trotzdem
3. In einem Ordner ohne `.git` → kein `git pull`-Versuch, normales Copy-Verhalten
4. Gesamter Output sieht so aus (Beispiel):
   ```
   KanPrompt Update -> v0.7.2
     git pull... already up to date
     Schema: 1.0.0 (up to date)
     Updated to v0.7.2 in C:\Users\christian.mangold\.kanprompt
     Reload browser (F5) to apply.
   ```

## Session-Log — Pflichtaufgabe nach Abschluss

Nachdem alle Änderungen umgesetzt und verifiziert sind, ist als **letzter Schritt** folgendes zu tun:

Öffne diese Prompt-Datei und hänge am Ende — unterhalb dieses Abschnitts — ein ausgefülltes Session-Log an. Ersetze dabei diesen gesamten Abschnitt (ab der Überschrift „Session-Log") durch das fertige Log.

Das Log muss folgende Struktur haben:

---

# Session-Log

- **Datum:** (heutiges Datum im Format YYYY-MM-DD)
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
