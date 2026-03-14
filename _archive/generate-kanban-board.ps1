# CC Prompt Workflow — Kanban Board Generator
# Liest das Template und die backlog-priority.json,
# setzt die aktuellen Daten ein, schreibt die fertige JSX.
#
# Verwendung (durch Claude.ai aufgerufen):
#   .\generate-kanban-board.ps1 -ProjectPath "C:\...\mein-projekt"
#
# Output: C:\Users\christian.mangold\.claude\kanban-board-generated.jsx

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath
)

$templatePath = Join-Path $PSScriptRoot "kanban-board-template.jsx"
$jsonPath = Join-Path $ProjectPath "doc\prompts\backlog-priority.json"
$donePath = Join-Path $ProjectPath "doc\prompts\done"
$outputPath = "C:\Users\christian.mangold\.claude\kanban-board-generated.jsx"

if (-not (Test-Path $templatePath)) { Write-Error "Template nicht gefunden: $templatePath"; exit 1 }
if (-not (Test-Path $jsonPath)) { Write-Error "JSON nicht gefunden: $jsonPath"; exit 1 }

# Read JSON
$json = Get-Content $jsonPath -Raw | ConvertFrom-Json

# Read done folder
$doneFiles = @()
if (Test-Path $donePath) {
    $doneFiles = Get-ChildItem $donePath -Filter "*.md" | Where-Object { $_.Name -ne ".gitkeep" }
}
$doneCount = $doneFiles.Count

# Tag mapping by filename prefix
$tagMap = @{
    "fix-" = @{ tag = "bug fix"; accent = "#ef4444" }
    "geo-" = @{ tag = "geo map"; accent = "#3b82f6" }
    "validate-" = @{ tag = "shacl"; accent = "#64748b" }
    "create-" = @{ tag = "data"; accent = "#10b981" }
    "package-" = @{ tag = "build"; accent = "#8b5cf6" }
    "test-" = @{ tag = "misc"; accent = "#94a3b8" }
    "feat-" = @{ tag = "geo map"; accent = "#3b82f6" }
    "cleanup-" = @{ tag = "misc"; accent = "#94a3b8" }
    "ux-" = @{ tag = "misc"; accent = "#94a3b8" }
    "code-review" = @{ tag = "review"; accent = "#94a3b8" }
    "phase" = @{ tag = "misc"; accent = "#94a3b8" }
    "prompt-" = @{ tag = "misc"; accent = "#94a3b8" }
    "gui-" = @{ tag = "misc"; accent = "#94a3b8" }
    "geometry-" = @{ tag = "geo map"; accent = "#3b82f6" }
}

function Get-TagInfo($id) {
    foreach ($prefix in $tagMap.Keys) {
        if ($id.StartsWith($prefix)) { return $tagMap[$prefix] }
    }
    return @{ tag = "misc"; accent = "#94a3b8" }
}

# Build BACKLOG_DATA
$blLines = @()
foreach ($item in $json.backlog) {
    $ti = Get-TagInfo $item.id
    $blocked = if ($item.blocked) { "true" } else { "false" }
    $line = "  { id: `"$($item.id)`", file: `"$($item.file)`", title: `"$($item.title)`", blocked: $blocked"
    if ($item.blocked -and $item.blockedBy) {
        $line += ", blockedBy: `"$($item.blockedBy)`""
    }
    $line += ", tag: `"$($ti.tag)`", accent: `"$($ti.accent)`" },"
    $blLines += $line
}
$backlogJs = "const BACKLOG_DATA = [`n" + ($blLines -join "`n") + "`n];"

# Build IN_PROGRESS_DATA
$ipLines = @()
foreach ($item in $json.inProgress) {
    $ti = Get-TagInfo $item.id
    $line = "  { id: `"$($item.id)`", file: `"$($item.file)`", title: `"$($item.title)`""
    if ($item.commit) { $line += ", commit: `"$($item.commit)`"" }
    $line += ", tag: `"$($ti.tag)`", accent: `"$($ti.accent)`" },"
    $ipLines += $line
}
$ipJs = "const IN_PROGRESS_DATA = [`n" + ($ipLines -join "`n") + "`n];"

# Build DONE_DATA — today's items from JSON, rest summarized from filesystem
$today = (Get-Date).ToString("yyyy-MM-dd")
$todayItems = @()
$jsonDoneCount = 0

if ($json.done) {
    foreach ($item in $json.done) {
        $jsonDoneCount++
        if ($item.done -eq $today) {
            $ti = Get-TagInfo $item.id
            $title = $item.title -replace '"', '\"'
            $todayItems += @{ title = $title; tag = $ti.tag }
        }
    }
}

# Count filesystem done files not in JSON (older items without timestamps)
$fsDoneCount = 0
if (Test-Path $donePath) {
    $fsDoneCount = (Get-ChildItem $donePath -Filter "*.md" | Where-Object { $_.Name -ne ".gitkeep" }).Count
}
$olderCount = [Math]::Max(0, $fsDoneCount - $jsonDoneCount)

$doneLines = @()
foreach ($ti in $todayItems) {
    $doneLines += "  { title: `"$($ti.title)`", tag: `"$($ti.tag)`", count: 0, today: true },"
}
$totalOlder = $olderCount + ($jsonDoneCount - $todayItems.Count)
if ($totalOlder -gt 0) {
    $doneLines += "  { title: `"$totalOlder weitere abgeschlossene Prompts`", tag: `"misc`", count: $totalOlder, today: false },"
}
if ($doneLines.Count -eq 0) {
    $doneLines += "  { title: `"$fsDoneCount abgeschlossene Prompts`", tag: `"misc`", count: $fsDoneCount, today: false },"
}
$doneJs = "const DONE_DATA = [`n" + ($doneLines -join "`n") + "`n];"

# Read template and replace data sections
$template = Get-Content $templatePath -Raw
$template = $template -replace '(?s)// BACKLOG_DATA_START.*?// BACKLOG_DATA_END', "// BACKLOG_DATA_START`n$backlogJs`n// BACKLOG_DATA_END"
$template = $template -replace '(?s)// IN_PROGRESS_DATA_START.*?// IN_PROGRESS_DATA_END', "// IN_PROGRESS_DATA_START`n$ipJs`n// IN_PROGRESS_DATA_END"
$template = $template -replace '(?s)// DONE_DATA_START.*?// DONE_DATA_END', "// DONE_DATA_START`n$doneJs`n// DONE_DATA_END"

# Write output
$template | Out-File -FilePath $outputPath -Encoding utf8
Write-Output "Generated: $outputPath ($((Get-Item $outputPath).Length) bytes, Backlog: $($json.backlog.Count), InProgress: $($json.inProgress.Count), Done: $doneCount)"
