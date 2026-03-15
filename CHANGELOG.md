# Changelog

All notable changes to KanPrompt will be documented in this file.

## [0.7.3] - 2026-03-15

### Added
- Add KanPrompt prompt workflow (dogfooding) with 5 backlog items and 4 done items
- Add schema versioning (v1.0.0) and CLAUDE.md
- Auto git pull in update.ps1 before deploying
- Replace Claude.ai button with Claude Desktop launcher

### Changed
- Update workflow docs to ISO timestamps with time-of-day

### Fixed
- Update Claude Desktop icon to ✨ and bump version to 0.7.3

## [0.7.2] - 2026-03-14

### Changed
- Remove dead title tooltips on draggable cards

## [0.7.1] - 2026-03-14

### Fixed
- Show date+time on all cards, e.g. 14.03. 16:45

## [0.7.0] - 2026-03-14

### Added
- Initial repo structure v0.6.7
- ISO timestamps with time-of-day, sorted done column

## [0.6.7] - 2026-03-14

### Changed
- Done column: newest entries on top, archive button at bottom

### Fixed
- Preview panel invisible due to saved 1px width (localStorage race condition during CSS transition)
- Validate saved preview width: ignore values below 200px
- Save width only when panel is fully open (>= 200px)

## [0.6.5] - 2026-03-14

### Added
- Toggle behavior: clicking same card closes preview
- Refresh button in detail view

### Fixed
- Timestamp rules for backward transitions (clean reset)
- No auto-fill of `inProgress` when skipping directly to Done

## [0.5.0] - 2026-03-13

### Added
- Companion server for desktop integration (VS Code, Claude Code, Explorer, Terminal)
- Resize handle on preview panel (width saved to localStorage)
- Blocked/unblocked workflow with reason field
- Date grouping in Done column (Heute / Diese Woche / Älter)
- Archive overlay for browsing all done items
- Inline Markdown editor with save/cancel

## [0.4.0] - 2026-03-12

### Added
- Drag & drop reordering within and between columns
- Drop indicator during drag
- New Prompt modal with auto-generated filename
- Delete with move to `deleted/` folder
- Folder ↔ JSON sync button

## [0.3.0] - 2026-03-11

### Added
- File System Access API for direct disk read/write
- Auto-polling with configurable interval
- Project memory via IndexedDB (recent projects list)
- Claude.ai project URL integration

## [0.1.0] - 2026-03-10

### Added
- Initial standalone HTML Kanban board
- Three columns: Backlog, In Progress, Done
- JSON as single source of truth (`backlog-priority.json`)
- Card preview panel with Markdown rendering
