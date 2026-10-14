# Feature: Neues Projekt von der Startseite registrieren

## Motivation

Aktuell kann man auf der Startseite (Welcome Screen) nur einen bestehenden Projektordner oeffnen. Es gibt keine Moeglichkeit, ein neues Projekt direkt ueber die UI in der Companion-Registry anzulegen. Will man ein neues Projekt starten, muss man es manuell vorbereiten (Ordnerstruktur, `doc/prompts/`-Verzeichnisse) und dann den Ordner oeffnen, damit die Auto-Registrierung greift.

## Anforderungen

### Muss

- Auf der Startseite einen Button **"+ Neues Projekt"** (o.ae.) neben "Projekt-Ordner oeffnen" anbieten
- Dialog/Formular mit mindestens:
  - **Projekt-Name** (wird als ID in der Registry verwendet)
  - **Projekt-Pfad** (lokaler Ordnerpfad, ggf. ueber Ordnerauswahl-Dialog)
- Beim Anlegen:
  - Projekt ueber `PUT /api/projects/:id` im Companion registrieren
  - Falls `doc/prompts/`-Struktur im Zielordner noch nicht existiert: automatisch Scaffold anlegen (Unterordner `new/`, `in-progress/`, `done/`, `deleted/`)
  - Danach direkt ins neue Projekt wechseln (Board oeffnen)
- Button nur aktiv, wenn der Companion erreichbar ist (ohne Companion kein Registry-Zugriff)

### Kann

- Vorschlag des Projektnamens aus dem Ordnernamen ableiten
- Validierung: Pruefen ob Projekt-ID bereits existiert (Warnung/Fehler)
- Pfad-Eingabe mit Browse-Button (File System Access API) als Alternative zur manuellen Eingabe

## Betroffene Dateien

- `kanprompt.html` — Welcome Screen (HTML + JS): neuer Button, Modal/Dialog, Logik
- `companion/kanprompt-companion.js` — ggf. Scaffold-Endpunkt falls serverseitig (oder clientseitig ueber File System Access API)

## Abgrenzung

- Kein Import bestehender Backlog-Daten — das uebernimmt die bestehende `migrate-backlog`-Logik
- Kein Projekttemplate-System — nur die Grundstruktur wird angelegt

---

# Session-Log — Pflichtaufgabe

> Diesen Abschnitt nach Abschluss der Implementierung durch das tatsaechliche
> Session-Log ersetzen. Vorlage: `workflow/CLAUDE-backlog-section.md`
