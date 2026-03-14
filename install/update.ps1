# KanPrompt Update Script
# After git pull, run this to sync files to ~/.kanprompt/
# Can also be run standalone from ~/.kanprompt/ (copies from repo).

param(
    [string]$RepoRoot
)

# Auto-detect repo root
if (-not $RepoRoot) {
    # Check if we're inside the repo
    $scriptDir = $PSScriptRoot
    if (Test-Path "$scriptDir\..\kanprompt.html") {
        $RepoRoot = (Resolve-Path "$scriptDir\..").Path
    } elseif (Test-Path "$scriptDir\..\..\kanprompt.html") {
        $RepoRoot = (Resolve-Path "$scriptDir\..\..").Path
    } else {
        # Fallback: standard location
        $RepoRoot = "C:\git\local\KanPrompt"
    }
}

$target = "$env:USERPROFILE\.kanprompt"

if (-not (Test-Path "$RepoRoot\kanprompt.html")) {
    Write-Host "ERROR: kanprompt.html not found in $RepoRoot" -ForegroundColor Red
    Write-Host "  Run: git pull   (in the KanPrompt repo first)" -ForegroundColor Yellow
    exit 1
}

# Get version from repo
$ver = Select-String -Path "$RepoRoot\kanprompt.html" -Pattern "const VERSION = '([^']+)'" | 
    ForEach-Object { $_.Matches[0].Groups[1].Value }

Write-Host "KanPrompt Update -> v$ver" -ForegroundColor Cyan

# Copy files
Copy-Item "$RepoRoot\kanprompt.html" -Destination "$target\kanprompt.html" -Force
foreach ($f in @("kanprompt-companion.js", "start-companion.bat", "start-companion-silent.vbs")) {
    if (Test-Path "$RepoRoot\companion\$f") {
        Copy-Item "$RepoRoot\companion\$f" -Destination "$target\$f" -Force
    }
}

Write-Host "  Updated to v$ver in $target" -ForegroundColor Green
Write-Host "  Reload browser (F5) to apply." -ForegroundColor Yellow
