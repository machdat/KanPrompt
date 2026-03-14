# KanPrompt

A standalone Kanban board for managing Claude Code prompts. Runs as a local HTML file in Chrome/Edge — no server, no cloud, no AI roundtrip for board operations.

## Features

- **Drag & drop** between Backlog → In Progress → Done
- **Direct disk access** via File System Access API (Chrome/Edge)
- **JSON as single source of truth** (`backlog-priority.json`) — readable by Claude Code, scripts, anything
- **Inline Markdown editor** for prompt files
- **Companion server** for desktop integration (VS Code, Claude Code, Explorer, Terminal)
- **Auto-polling** for external changes (configurable interval)
- **Project memory** — remembers recently opened projects

## Quick Start

```powershell
# Clone
git clone git@github.com:machdat/KanPrompt.git C:\git\local\KanPrompt

# Install (copies files to ~/.kanprompt/)
powershell -ExecutionPolicy Bypass -File C:\git\local\KanPrompt\install\install.ps1

# Open in browser
start file:///C:/Users/%USERNAME%/.kanprompt/kanprompt.html
```

## Update

```powershell
cd C:\git\local\KanPrompt
git pull
powershell -ExecutionPolicy Bypass -File install\update.ps1
# Then F5 in the browser
```

## Project Structure

```
KanPrompt/
├── kanprompt.html              # The app (open in browser)
├── companion/
│   ├── kanprompt-companion.js  # Node.js companion server
│   ├── start-companion.bat     # Start companion (visible)
│   └── start-companion-silent.vbs  # Start companion (hidden/autostart)
├── workflow/
│   ├── CLAUDE-backlog-section.md   # Paste into CLAUDE.md for CC integration
│   ├── README.md                   # Workflow documentation
│   └── scaffold/                   # Template for new projects
│       └── doc/prompts/{new,in-progress,done,deleted}/
├── install/
│   ├── install.ps1             # One-time setup
│   └── update.ps1              # Sync after git pull
├── _archive/                   # Old prototypes (historical)
├── CHANGELOG.md
└── README.md
```

## How It Works

1. Open `kanprompt.html` in Chrome or Edge
2. Select a project folder (e.g., `my-project/`) — KanPrompt navigates to `doc/prompts/` inside it
3. Cards are backed by `.md` files in `new/`, `in-progress/`, `done/` folders
4. Drag & drop moves files between folders and updates `backlog-priority.json`
5. Claude Code reads the same JSON to pick up the next task

## Companion Server (optional)

The companion server bridges browser sandbox limitations:

- **⚡ Claude Code** — start CC in the project root
- **💻 VS Code** — open a prompt file directly
- **📂 Explorer / 🖥️ Terminal** — open at project path

Start with `companion/start-companion.bat` or set up autostart via `shell:startup`.

## Claude Code Integration

Add the contents of `workflow/CLAUDE-backlog-section.md` to your project's `CLAUDE.md`. This teaches Claude Code how to work with the Kanban JSON — reading the next task, moving items between phases, and setting timestamps.

## License

MIT
