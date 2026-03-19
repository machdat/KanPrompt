# CC-Button prominent am rechten Rand der Preview-Toolbar

## Problem / Motivation

Der "⚡ CC" Button in der Preview-Toolbar ist aktuell genauso klein wie alle anderen Buttons (`.btn-sm`, 11px). Da der CC-Workflow ab jetzt häufig genutzt wird, soll der Button deutlich prominenter und größer sein — mindestens doppelt so groß — und am rechten Rand der Toolbar stehen (vor dem ✕ Close-Button). Die Worktree-Checkbox soll direkt daneben bleiben.

## Betroffene Dateien

- `kanprompt.html` — Preview-Toolbar HTML-Reihenfolge, CSS für prominenten CC-Button

## Ist-Zustand

- CC-Button ist ein normaler `.btn-sm` (11px, 3px 8px Padding) zwischen Editor und Extern-Button
- Worktree-Checkbox ist ein kleines Label (10px) direkt nach dem CC-Button
- Alle Buttons sind gleichberechtigt in einer Flex-Row

## Soll-Zustand

1. **CC-Button vergrößern**: Mindestens doppelte Größe — eigene CSS-Klasse (z.B. `.btn-cc`) mit:
   - `font-size: 14px` (statt 11px)
   - `padding: 6px 16px` (statt 3px 8px)
   - Primärfarbe (`--accent-blue` Background oder auffälliger Border)
   - Eventuell leichter Glow oder Hover-Effekt
2. **Position**: CC-Button + Worktree-Checkbox am **rechten Rand** der Toolbar, direkt links vom ✕-Close-Button. Dazwischen ein `flex-grow: 1` Spacer, damit die anderen Buttons (🔄, 💻, 📤, ✎) links bleiben.
3. **Worktree-Checkbox** bleibt direkt links vom CC-Button, visuell zusammengehörig

## Constraints

- Bestehende Toolbar-Buttons (🔄 Refresh, 💻 Editor, 📤 Extern, ✎ Edit) bleiben unverändert
- CC-Button + Worktree bleiben `companion-only` (nur sichtbar wenn Companion läuft)
- Close-Button ✕ bleibt ganz rechts

## Verifikation

1. Preview öffnen → CC-Button ist deutlich größer als andere Buttons
2. CC-Button + Worktree-Checkbox stehen rechts, andere Buttons links
3. Companion aus → CC-Button + Worktree verschwinden, Layout bricht nicht
4. Klick auf CC-Button → Funktion wie bisher

---

# Session-Log

- **Datum:** 2026-03-18T22:12:00
- **Branch:** feature/gui-cc-button-prominent
- **Ergebnis:** Erfolgreich

## Zusammenfassung
CC-Button in der Preview-Toolbar prominent gemacht: eigene CSS-Klasse `.btn-cc` mit doppelter Größe, blauer Primärfarbe und Glow-Effekt. Button + Worktree-Checkbox per Flex-Spacer nach rechts verschoben, direkt vor den Close-Button.

## Geänderte Dateien
- `kanprompt.html` — Neue CSS-Klasse `.btn-cc` (14px, 6px 16px Padding, accent-blue Background, box-shadow Glow), HTML-Reihenfolge der Toolbar-Buttons geändert (Spacer eingefügt, CC+Worktree nach rechts), Version-Bump auf 0.15.0

## Abweichungen vom Prompt
Keine.

## Offene Punkte
Keine.
