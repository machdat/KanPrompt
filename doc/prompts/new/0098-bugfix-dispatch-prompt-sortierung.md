# Bugfix: Dispatch-Prompt-Dropdown ignoriert cardPriority-Sortierung

## Problem / Motivation

Das Prompt-Dropdown im CC Dispatch zeigt die Karten nicht in der im Board definierten Reihenfolge an. Dieses Problem wurde bereits einmal adressiert, ist aber nicht korrekt gefixt worden.

### Ursache: Typ-Mismatch bei cardPriority-Lookup

In der Dispatch-API (`GET /api/dispatch/prompt`) wird die Sortierung über `cardPriority` aufgelöst. Dabei gibt es einen Typ-Mismatch:

- `cardPriority` enthält `num`-Werte als **Integers**: `[96, 95, 94, ...]`
- Der Sort-Lookup greift auf `card.id` zu — das sind **Padded Strings**: `"0096"`, `"0095"`, ...
- `prioIndex["0096"]` ist immer `undefined` → Fallback `9999` → keine Sortierung

### Betroffene Stelle

`companion/kanprompt-companion.js`, Zeile 1528–1532:

```javascript
const priority = proj.cardPriority || [];
const prioIndex = {};
priority.forEach((id, i) => prioIndex[id] = i);    // Keys: 96, 95, 94 (nums)
const backlog = cards.filter(c => c.status === 'new')
  .sort((a, b) => (prioIndex[a.id] ?? 9999) - (prioIndex[b.id] ?? 9999));  // Lookup: "0096" (string) → undefined
```

## Betroffene Dateien

- `companion/kanprompt-companion.js` — Dispatch-Endpoint (Zeile ~1525ff.)

## Soll-Zustand

Der Sort-Lookup muss `card.num` (Integer) statt `card.id` (String) verwenden:

```javascript
const priority = proj.cardPriority || [];
const prioIndex = {};
priority.forEach((num, i) => prioIndex[num] = i);
const backlog = cards.filter(c => c.status === 'new')
  .sort((a, b) => (prioIndex[a.num] ?? 9999) - (prioIndex[b.num] ?? 9999));
const inProgress = cards.filter(c => c.status === 'in-progress')
  .sort((a, b) => (prioIndex[a.num] ?? 9999) - (prioIndex[b.num] ?? 9999));
```

Zusätzlich prüfen: Gibt es weitere Stellen im Companion oder in `kanprompt.html`, die `cardPriority` gegen `card.id` statt `card.num` matchen?

## Constraints

- Einzeilige Änderung (`.id` → `.num`), aber alle Stellen prüfen wo `cardPriority` sortiert wird
- CHANGELOG.md-Eintrag

## Verifikation

- Dispatch-Dropdown zeigt Karten in derselben Reihenfolge wie das KanPrompt-Board
- Reihenfolge im Board ändern (Drag & Drop) → Dispatch spiegelt die neue Reihenfolge
- Karten ohne Position in `cardPriority` → erscheinen am Ende (Fallback 9999)

---

# Session-Log — Pflichtaufgabe

> ⚠️ Dieser Abschnitt ist nach Abschluss der Umsetzung auszufüllen.