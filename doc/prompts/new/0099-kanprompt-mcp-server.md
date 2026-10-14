# Feature: KanPrompt als MCP-Server

## Motivation

KanPrompt soll die zentrale Schnittstelle sein, ueber die parallel an mehreren
Projekten die Entwicklung vorangetrieben werden kann. Der organisatorische
Flaschenhals - "welches Projekt, welcher Stand, was ist offen?" - soll geoeffnet
werden, damit mehrere Projekte gleichzeitig aktiv bearbeitet werden koennen.

### Problem: Claude-Agenten koennen den Companion nicht nativ erreichen

| Client | Zugang zu Companion REST-API | Problem |
|--------|------------------------------|---------|
| **Cowork (Container)** | Nur ueber Windows-MCP PowerShell | `127.0.0.1` im Container != Host |
| **Claude Code (Host)** | Theoretisch ja, kein natives Tool | Kein curl/fetch als CC-Tool |
| **KanPrompt Web-UI** | Direkt (gleicher Host) | Kein Problem |

### Loesung: KanPrompt Companion als MCP-Server

Ein MCP-Server (Model Context Protocol) exponiert die Companion-Funktionalitaet
als Tool-Definitionen, die jeder MCP-faehige Client nativ aufrufen kann:
Cowork, Claude Code, Claude Desktop.

## Architektur-Konzept

### Variante A: Companion spricht zusaetzlich MCP (stdio)

Der bestehende Companion-Prozess (Node.js/Express) erhaelt einen zweiten
Kommunikationskanal: neben HTTP (Port 9177) auch stdio (JSON-RPC).

```
                    ┌──────────────────────────┐
                    │   KanPrompt Companion     │
                    │                           │
  Browser/UI ──────▶│  Express HTTP :9177       │
                    │                           │
  Claude Code ─────▶│  MCP stdio (JSON-RPC)     │
  Cowork      ─────▶│                           │
  Claude Desktop ──▶│  Shared Business Logic    │
                    │  (Registry, Cards, Git)   │
                    └──────────────────────────┘
```

Vorteil: Ein Prozess, eine Datenquelle, kein Proxy.
Nachteil: Companion muss als MCP-Server in claude_desktop_config.json
registriert werden und laeuft dann als Child-Process des Clients.

### Variante B: Separater MCP-Proxy (empfohlen fuer den Start)

Ein duenner MCP-Server-Prozess, der intern HTTP-Calls an den laufenden
Companion macht. Der Companion bleibt unveraendert.

```
  Claude Code ──▶ kanprompt-mcp (stdio) ──▶ Companion REST :9177
  Cowork      ──▶ kanprompt-mcp (stdio) ──▶ Companion REST :9177
```

Vorteil: Companion-Code bleibt sauber, MCP-Layer ist austauschbar.
Nachteil: Zweiter Prozess, Companion muss laufen.

**Empfehlung:** Mit Variante B starten (geringeres Risiko, schneller umsetzbar),
spaeter optional zu Variante A migrieren.

## MCP-Tool-Definitionen (Entwurf)

Die folgenden Tools bilden die Kern-API ab:

### Projekt-uebergreifend

| Tool | Parameter | Beschreibung |
|------|-----------|-------------|
| `kanprompt_list_projects` | - | Alle registrierten Projekte auflisten |
| `kanprompt_project_status` | `projectId` | Status eines Projekts: offene/blockierte/in-progress Karten, Git-Status |
| `kanprompt_cross_project_overview` | - | Uebersicht ueber alle Projekte: naechste offene Items, blockierte Items |

### Karten-Management

| Tool | Parameter | Beschreibung |
|------|-----------|-------------|
| `kanprompt_list_cards` | `projectId`, `status?` | Karten eines Projekts auflisten (optional nach Status filtern) |
| `kanprompt_get_card` | `projectId`, `cardId` | Details einer Karte inkl. Prompt-Inhalt |
| `kanprompt_create_card` | `projectId`, `title`, `type`, `content?` | Neue Karte anlegen (Prompt-Datei wird erzeugt) |
| `kanprompt_update_status` | `projectId`, `cardId`, `status` | Status-Transition (new → in-progress → done) |
| `kanprompt_set_blocked` | `projectId`, `cardId`, `blocked`, `reason?` | Karte blockieren/entblockieren |

### Session-Integration

| Tool | Parameter | Beschreibung |
|------|-----------|-------------|
| `kanprompt_start_session` | `projectId`, `cardId` | Karte auf in-progress setzen, Prompt-Inhalt zurueckgeben |
| `kanprompt_end_session` | `projectId`, `cardId`, `result`, `sessionLog` | Session-Log anhaengen, Karte auf done setzen |
| `kanprompt_next_item` | `projectId?` | Naechstes nicht-blockiertes Backlog-Item (projekt- oder global) |

### Git/Worktree (optional, Phase 2)

| Tool | Parameter | Beschreibung |
|------|-----------|-------------|
| `kanprompt_git_status` | `projectId` | Git-Status des Projekts |
| `kanprompt_worktree_list` | `projectId` | Aktive Worktrees |
| `kanprompt_worktree_create` | `projectId`, `cardId` | Worktree fuer eine Karte anlegen |

## Implementierungsplan

### Phase 1: Minimaler MCP-Proxy (Variante B)

1. Node.js-Paket `kanprompt-mcp` anlegen (im KanPrompt-Repo oder separat)
2. `@modelcontextprotocol/sdk` als Dependency
3. Tool-Handler implementieren die auf `http://127.0.0.1:9177/api/...` delegieren
4. Registrierung in `claude_desktop_config.json` dokumentieren
5. Testen mit Claude Desktop und/oder Claude Code

Geschaetzter Aufwand: 1-2 CC-Sessions

### Phase 2: Cross-Project Intelligence

6. `kanprompt_next_item` mit Priorisierung ueber alle Projekte
7. `kanprompt_cross_project_overview` fuer Session-Start
8. Automatische Kontextanreicherung (memory.md des Projekts mitlesen)

### Phase 3: Bidirektionale Integration

9. Companion kann MCP-Events empfangen (Karte fertig → UI-Update)
10. Optional: Variante A (MCP direkt im Companion)

## Abgrenzung

- Die Web-UI (kanprompt.html + Dispatch) bleibt unveraendert und laeuft parallel
- Der Companion REST-API bleibt die SSoT — der MCP-Server ist nur ein Adapter
- Keine Aenderungen an bestehenden Projekten (erju_wp27 etc.) noetig
- Die backlog-priority.json wird weiterhin NICHT direkt editiert

## Verifikation

1. Claude Code Session: `kanprompt_list_projects` → gibt erju_wp27 und KanPrompt zurueck
2. Claude Code Session: `kanprompt_create_card` → Karte erscheint im KanPrompt-Board
3. Cowork Session: `kanprompt_next_item` → gibt naechstes offenes Item zurueck
4. Round-Trip: Karte anlegen → in-progress → done mit Session-Log → alles im Board sichtbar
