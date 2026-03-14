# Git-Repo aufsetzen und Dateien entflechten

## Problem / Motivation

KanPrompt-Dateien lagen verstreut über drei Orte: `~/.kanprompt/`, `cc-prompt-workflow/`, `git/local/KanPrompt/` (nur alte Prototypen). Kein Git-Repo, kein Versionsmanagement, Deploy über Dropbox-Ping-Pong.

## Ergebnis

- Saubere Repo-Struktur: App im Root, `companion/`, `workflow/`, `install/`, `_archive/`
- Public GitHub Repo: https://github.com/machdat/KanPrompt
- Install/Update-Scripts für lokales Deployment
- MIT Lizenz, README, CHANGELOG

# Session-Log

- **Datum:** 2026-03-14
- **Branch:** master
- **Ergebnis:** Erfolgreich

## Zusammenfassung

Git-Repo initialisiert, 28 Dateien aus drei Quellen zusammengeführt, auf GitHub gepusht als public repo unter machdat/KanPrompt.

## Geänderte Dateien

- `kanprompt.html` — Haupt-App (aus ~/.kanprompt/ kopiert)
- `companion/*` — Companion Server + Launcher
- `workflow/*` — CC-Prompt-Workflow-Doku + Scaffold
- `install/install.ps1` — Einmalige Installation
- `install/update.ps1` — Update nach git pull
- `README.md`, `CHANGELOG.md`, `LICENSE`, `.gitignore` — Neu erstellt
- `_archive/*` — Alte Prototypen + Scripts archiviert

## Abweichungen vom Prompt

Kein formaler Prompt — entstand aus der Session-Diskussion heraus.

## Offene Punkte

Keine.
