# Abschnitt für CLAUDE.md — Einfügen unter "Development Guidelines"

Kopiere den folgenden Abschnitt in die CLAUDE.md deines Projekts:

---

### CC-Prompt Workflow and Session Logging

Development tasks are driven by prompt files in `doc/prompts/` with a folder-based lifecycle:
- `doc/prompts/new/` — to be implemented (= Backlog)
- `doc/prompts/in-progress/` — active implementation
- `doc/prompts/done/` — completed (with session log)
- `doc/prompts/deleted/` — removed

The prioritized task queue is `doc/prompts/backlog-priority.json` with three arrays:
`backlog`, `inProgress`, `done`. Each entry references a prompt file and carries
timestamp fields (`new`, `inProgress`, `done`) in YYYY-MM-DDTHH:MM:SS format (ISO with time-of-day).

**Board management** happens in KanPrompt (standalone HTML app) or Claude.ai —
NOT in Claude Code. CC only reads and updates the JSON when executing tasks.

#### When asked to work on the next task:

1. Read `doc/prompts/backlog-priority.json`
2. Find the first entry in `backlog` where `blocked` is `false` (or absent)
3. **Present the task to the user and wait for explicit confirmation** before starting
4. On confirmation:
   - Move the prompt file from `new/` to `in-progress/`
   - Move the entry from `backlog` to `inProgress` in the JSON
   - Set `"inProgress": "YYYY-MM-DDTHH:MM:SS"` with current date and time
   - Begin implementation
5. On completion:
   - Append the session log to the prompt file (see below)
   - Move the prompt file from `in-progress/` to `done/`
   - Move the entry from `inProgress` to `done` array in the JSON
   - Set `"done": "YYYY-MM-DDTHH:MM:SS"` with current date and time

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
