# KanPrompt Install Script
# Run once to set up ~/.kanprompt/ from the Git repo.

param(
    [string]$RepoRoot = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
)

$target = "$env:USERPROFILE\.kanprompt"
Write-Host "KanPrompt Install" -ForegroundColor Cyan
Write-Host "  Repo:   $RepoRoot"
Write-Host "  Target: $target"
Write-Host ""

# Create target directory
if (-not (Test-Path $target)) {
    New-Item -ItemType Directory -Path $target | Out-Null
    Write-Host "  Created $target" -ForegroundColor Green
}

# Copy app
Copy-Item "$RepoRoot\kanprompt.html" -Destination "$target\kanprompt.html" -Force
Write-Host "  Copied kanprompt.html" -ForegroundColor Green

# Copy companion
foreach ($f in @("kanprompt-companion.js", "start-companion.bat", "start-companion-silent.vbs")) {
    Copy-Item "$RepoRoot\companion\$f" -Destination "$target\$f" -Force
    Write-Host "  Copied $f" -ForegroundColor Green
}

# Copy update script itself for standalone use
Copy-Item "$RepoRoot\install\update.ps1" -Destination "$target\update.ps1" -Force
Write-Host "  Copied update.ps1" -ForegroundColor Green

Write-Host ""
Write-Host "Done! Open in browser:" -ForegroundColor Cyan
Write-Host "  file:///$($target.Replace('\','/'))/kanprompt.html"
Write-Host ""
Write-Host "Optional: Set up companion autostart:" -ForegroundColor Yellow
Write-Host "  1. Win+R -> shell:startup -> Enter"
Write-Host "  2. Create shortcut to $target\start-companion-silent.vbs"
