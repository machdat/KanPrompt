# Abschnitt für CLAUDE.md — Einfügen unter "Development Guidelines"

Kopiere den folgenden Abschnitt in die CLAUDE.md deines Projekts:

---

### CC-Prompt Workflow and Session Logging

Development tasks are driven by prompt files in `doc/prompts/` with a folder-based lifecycle:
- `doc/prompts/new/` — to be implemented (= Backlog)
- `doc/prompts/in-progress/` — active implementation
- `doc/prompts/done/` — completed (with session log)
- `doc/prompts/deleted/` — removed

The **Companion server** is the **Single Source of Truth** for all project and card data.
It stores them in the Projects Registry (`companion/projects-registry.json`) and exposes
them via REST API. UI, Skills, Dispatcher and Claude Code access data exclusively through
this API. The local `doc/prompts/backlog-priority.json` is a **mirror/backup** written by
the Companion — not the authoritative source and must not be edited directly.

**Board management** happens in KanPrompt (HTML app served by the Companion) or Claude.ai —
NOT in Claude Code. CC reads card data via the Companion API when executing tasks.

#### When asked to work on the next task:

1. Load card data from the Companion (`GET /api/projects/:id`)
2. Find the first entry in `backlog` where `blocked` is `false` (or absent)
3. **Present the task to the user and wait for explicit confirmation** before starting
4. On confirmation:
   - Move the card to `inProgress` via the Companion API
   - Begin implementation
5. On completion:
   - Append the session log to the prompt file (see below)
   - Move the card to `done` via the Companion API

Do NOT start work without user confirmation. Always show what you intend to do first.

#### Timestamp rules

**Core principle:** A timestamp is only set for a state the prompt actually entered.
If a prompt skips a state (e.g. backlog → done, skipping in-progress), the skipped
timestamp stays empty.

**Forward moves:**
- **→ inProgress**: set `inProgress` = today
- **→ done**: set `done` = today. Do NOT auto-fill `inProgress` — if the prompt
  was never in progress, that field stays empty.

**Backward moves (clean reset):**
When a prompt is moved backward, timestamps are cleaned up — a reset means the
previous attempt never happened:

- **→ backlog (new/)**: delete `inProgress` and `done` timestamps. The entry looks
  as if it was never started.
- **→ inProgress (in-progress/)** from done: delete `done` timestamp. Set `inProgress`
  to today (fresh start).
- **→ deleted/**: no timestamp cleanup needed, entry is removed from the JSON.

This applies to KanPrompt (drag & drop) and to any manual JSON edits.

#### Session Log (mandatory after completing any prompt)

After all changes are implemented and verified, append this to the prompt file
(replace the "Session-Log — Pflichtaufgabe" placeholder section):

```
---

# Session-Log

- **Datum:** (today's date, YYYY-MM-DDTHH:MM:SS)
- **Branch:** (the branch name)
- **Ergebnis:** Erfolgreich / Teilweise / Fehlgeschlagen

## Zusammenfassung

(1-3 sentences: what was actually implemented)

## Geänderte Dateien

(list all changed files with a short description)

## Abweichungen vom Prompt

(what differed and why, or "Keine.")

## Offene Punkte

(anything left open, or "Keine.")
```

Full conventions: `doc/prompts/README.md`
