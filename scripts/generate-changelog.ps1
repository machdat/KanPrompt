# generate-changelog.ps1
# Generates CHANGELOG.md entries from git commit messages.
# Versions are detected from commit messages containing (vX.Y.Z).
# Only adds versions not already present in CHANGELOG.md.

param(
    [string]$RepoRoot = (git rev-parse --show-toplevel 2>$null),
    [switch]$DryRun
)

if (-not $RepoRoot) {
    Write-Host "ERROR: Not in a git repository" -ForegroundColor Red
    exit 1
}

$changelogPath = "$RepoRoot\CHANGELOG.md"

# Read existing changelog to find already-documented versions
$existingVersions = @()
if (Test-Path $changelogPath) {
    $existingContent = [System.IO.File]::ReadAllText($changelogPath, [System.Text.UTF8Encoding]::new($false))
    $existingVersions = [regex]::Matches($existingContent, '## \[([^\]]+)\]') |
        ForEach-Object { $_.Groups[1].Value }
}

Write-Host "Existing versions in CHANGELOG: $($existingVersions -join ', ')" -ForegroundColor Gray

# Ensure git output is read as UTF-8
$oldEncoding = [Console]::OutputEncoding
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

# Parse all commits, group by version
$log = git -C $RepoRoot log --reverse --format="%H|%s|%ai" 2>$null
if (-not $log) {
    Write-Host "ERROR: No commits found" -ForegroundColor Red
    exit 1
}

# Build version map: version -> { date, commits[] }
# Strategy: buffer commits, flush to version when a version marker is found.
# This assigns commits BEFORE a version marker to that version (they were work towards it).
$versions = [ordered]@{}
$buffer = @()

foreach ($line in $log) {
    $parts = $line -split '\|', 3
    if ($parts.Count -lt 3) { continue }
    $hash = $parts[0]
    $msg = $parts[1]
    $date = ($parts[2] -split ' ')[0]  # YYYY-MM-DD

    $detectedVersion = $null

    # Check if this commit contains a version marker at the end
    if ($msg -match '\(v(\d+\.\d+\.\d+)\)\s*$') {
        $detectedVersion = $Matches[1]
    }
    # Also detect "bump version to X.Y.Z" pattern
    elseif ($msg -match 'version[- ](?:to )?(\d+\.\d+\.\d+)') {
        $detectedVersion = $Matches[1]
    }

    if ($detectedVersion) {
        # Flush buffer + this commit into the detected version
        $buffer += $msg
        $versions[$detectedVersion] = @{ date = $date; commits = $buffer }
        $buffer = @()
    } else {
        $buffer += $msg
    }
}

# Map conventional commit prefixes to Keep a Changelog categories
function Get-Category($msg) {
    if ($msg -match '^feat:')    { return 'Added' }
    if ($msg -match '^fix:')     { return 'Fixed' }
    if ($msg -match '^cleanup:') { return 'Changed' }
    if ($msg -match '^docs:')    { return 'Changed' }
    if ($msg -match '^chore:')   { return $null }  # skip chore commits
    return $null
}

function Format-CommitMessage($msg) {
    # Strip prefix and version marker
    $clean = $msg -replace '^(feat|fix|cleanup|chore|docs):\s*', ''
    $clean = $clean -replace '\s*\(v[\d.]+\)\s*$', ''
    $clean = $clean.Trim()
    # Capitalize first letter
    if ($clean.Length -gt 0) {
        $clean = $clean.Substring(0,1).ToUpper() + $clean.Substring(1)
    }
    return $clean
}

# Filter to new versions only, sort descending
$newVersions = $versions.Keys | Where-Object { $_ -notin $existingVersions } |
    Sort-Object { [version]$_ } -Descending

if ($newVersions.Count -eq 0) {
    Write-Host "No new versions to add." -ForegroundColor Green
    exit 0
}

Write-Host "New versions to add: $($newVersions -join ', ')" -ForegroundColor Cyan

# Generate changelog entries
$newEntries = ""
foreach ($ver in $newVersions) {
    $v = $versions[$ver]
    $categories = [ordered]@{}

    foreach ($commit in $v.commits) {
        $cat = Get-Category $commit
        if (-not $cat) { continue }
        if (-not $categories.Contains($cat)) { $categories[$cat] = @() }
        $formatted = Format-CommitMessage $commit
        if ($formatted -and $formatted -notin $categories[$cat]) {
            $categories[$cat] += $formatted
        }
    }

    if ($categories.Count -eq 0) { continue }

    $newEntries += "## [$ver] - $($v.date)`n`n"
    foreach ($cat in $categories.Keys) {
        $newEntries += "### $cat`n"
        foreach ($item in $categories[$cat]) {
            $newEntries += "- $item`n"
        }
        $newEntries += "`n"
    }
}

if (-not $newEntries) {
    Write-Host "No meaningful entries to add (only chore commits)." -ForegroundColor Yellow
    exit 0
}

if ($DryRun) {
    Write-Host "`n--- DRY RUN ---`n" -ForegroundColor Yellow
    Write-Host $newEntries
    exit 0
}

# Insert new entries after the header
if (Test-Path $changelogPath) {
    $content = [System.IO.File]::ReadAllText($changelogPath, [System.Text.UTF8Encoding]::new($false))
    # Insert after the header lines (# Changelog + blank line + description + blank line)
    if ($content -match '(?s)^(# Changelog\r?\n\r?\nAll notable changes.*?\r?\n\r?\n)(.*)$') {
        $header = $Matches[1]
        $rest = $Matches[2]
        $content = $header + $newEntries + $rest
    } else {
        # Fallback: prepend after first line
        $lines = $content -split "`n", 2
        $content = $lines[0] + "`n`n" + $newEntries + $lines[1]
    }
} else {
    $content = "# Changelog`n`nAll notable changes to KanPrompt will be documented in this file.`n`n" + $newEntries
}

[System.IO.File]::WriteAllText($changelogPath, $content.TrimEnd() + "`n", [System.Text.UTF8Encoding]::new($false))
[Console]::OutputEncoding = $oldEncoding
Write-Host "CHANGELOG.md updated with: $($newVersions -join ', ')" -ForegroundColor Green
