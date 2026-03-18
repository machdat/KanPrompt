# Upgrade-Prozess Beendigung mit korrektem Button-Label

## Problem / Motivation

Nach einem erfolgreichen Schema-Upgrade ist der Nutzer im Modal-Dialog gefangen. Der einzige verfügbare Button heißt "Abbrechen", was semantisch falsch ist: das Upgrade ist bereits erfolgreich durchgeführt worden. "Abbrechen" erzeugt ein Unsicherheitsgefühl, als würde man etwas rückgängig machen oder ablehnen. Das Modal sollte stattdessen die erfolgreiche Beendigung klar signalisieren und eine intuitive Möglichkeit zum Schließen bieten.

## Betroffene Dateien

- `kanprompt.html` — JavaScript-Logik für `closeUpgradeModal()`, `performUpgrade()`, UI-Rendering des `#upgradeModalOverlay` und `#upgradeBtn`

## Ist-Zustand

1. **performUpgrade()** führt die Migration aus und zeigt das Ergebnis im Modal
2. **Modal-HTML** (`#upgradeModalOverlay`) hat:
   - `.modal-actions` mit zwei Buttons: "Abbrechen" + "🔄 Upgrade durchführen" (`id="upgradeBtn"`)
3. Nach erfolgreichem Upgrade bleibt das Modal offen; nur "Abbrechen" ist semantisch falsch verfügbar
4. Nutzer hat kein visuelles Feedback für SUCCESS vs. FAILURE in `#upgradeLog`

## Soll-Zustand

1. **closeUpgradeModal()** versteckt das Modal (aktuelles Verhalten beibehalten)
2. **performUpgrade()** soll:
   - Das Upgrade durchführen
   - Bei **Erfolg**: 
     - `#upgradeBtn` verstecken (`display: none`)
     - Neuen Button "✓ OK" oder "Schließen" sichtbar machen (oder `#upgradeBtn` umwidmen)
     - Button mit `onclick="closeUpgradeModal()"` konfigurieren
     - `#upgradeLog` mit grüner success-Nachricht aktualisieren (z.B. `color: var(--accent-green)`)
   - Bei **Fehler**: nur "Abbrechen" anbieten
3. **State-Management**:
   - Upgrade-Modal öffnet (z.B. per Schema-Badge-Click): beide Buttons in Default-Zustand
   - Nach erfolgreicher Migration: "Upgrade durchführen"-Button verstecken, "OK"-Button zeigen + grünes Log-Output
4. **UI-Update**: `#upgradeLog` mit visueller Klarheit (SUCCESS ✓ vs. ERROR ✗)

## Constraints

- Das Modal darf nicht automatisch nach X Sekunden schließen (user-initiated closing only)
- Der "Abbrechen"-Button ist nach SUCCESS nicht mehr möglich — nur "OK" anzeigen
- Bei Fehlern bleibt "Abbrechen" das primäre Mittel zum Beenden (kein OK-Button bei Fehler)
- `.modal-actions` in `#upgradeModalOverlay` darf sich **nicht verändern**; nur Button-Visibility/State ändern
- Die Version muss nach erfolgreicher Migration in `.kanprompt-version.json` persisted sein

## Verifikation

1. ✓ Schema-Upgrade-Szenario auslösen (z.B. `.kanprompt-version.json` fehlt)
2. ✓ Modal öffnet, zeigt "🔄 Upgrade durchführen" + "Abbrechen"
3. ✓ Nach Upgrade: "Upgrade durchführen" versteckt, "✓ OK" sichtbar + grünes Log
4. ✓ "OK" klicken → Modal schließt, App ist wieder nutzbar
5. ✓ Reload: Migration nicht erneut angeboten (Version in `.kanprompt-version.json` vorhanden)
6. ✓ Bei Upgrade-Fehler: Error-Log rot, "Abbrechen" bleibt einziger Exit-Button

## Session-Log — Pflichtaufgabe nach Abschluss

Nachdem alle Änderungen umgesetzt und verifiziert sind, ist als **letzter Schritt** folgendes zu tun:
Öffne diese Prompt-Datei und hänge am Ende ein ausgefülltes Session-Log an.
Ersetze dabei diesen gesamten Abschnitt durch das fertige Log.
