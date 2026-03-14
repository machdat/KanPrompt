# CC Prompt Workflow — Setup Script
# Kopiert das Scaffold in ein Zielprojekt
#
# Verwendung: .\setup-prompt-workflow.ps1 -TargetPath "C:\pfad\zum\projekt"

param(
    [Parameter(Mandatory=$true)]
    [string]$TargetPath
)

$ScaffoldPath = Join-Path $PSScriptRoot "scaffold"

if (-not (Test-Path $TargetPath)) {
    Write-Error "Zielpfad existiert nicht: $TargetPath"
    exit 1
}

$PromptDir = Join-Path $TargetPath "doc\prompts"
if (Test-Path $PromptDir) {
    Write-Warning "doc/prompts/ existiert bereits in $TargetPath"
    $confirm = Read-Host "Trotzdem fortfahren? (j/n)"
    if ($confirm -ne "j") { exit 0 }
}

# Kopiere Scaffold
Copy-Item -Path (Join-Path $ScaffoldPath "*") -Destination $TargetPath -Recurse -Force

Write-Host ""
Write-Host "Prompt-Workflow eingerichtet in: $TargetPath" -ForegroundColor Green
Write-Host ""
Write-Host "Naechste Schritte:" -ForegroundColor Cyan
Write-Host "  1. Fuege den Inhalt von CLAUDE-backlog-section.md in deine CLAUDE.md ein"
Write-Host "  2. Loesche CLAUDE-backlog-section.md aus dem Projekt"
Write-Host "  3. Erstelle Prompts in doc/prompts/new/ (verwende TEMPLATE.md als Vorlage)"
Write-Host "  4. Fuege Eintraege in doc/prompts/backlog-priority.json hinzu"
Write-Host "  5. In Claude.ai: 'Zeig mir das Kanban-Board'"
Write-Host ""
