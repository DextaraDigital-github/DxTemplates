# Deploys LWC components to the scratch org and proves that the org now holds exactly the local files.
# After a deploy the browser can still serve the OLD component for a few reloads (Lightning caches component code in
# the browser). This script settles the first question quickly: did the org get the new code? If it says MATCH and the
# page still behaves the old way, the browser is stale (see the steps at the end of the output).
#
# Usage (repo root, PowerShell):
#   .\docs\tools\deploy-and-verify.ps1 templateDesignerCMP
#   .\docs\tools\deploy-and-verify.ps1 templateRelatedObjects,displayRelatedObjectsData
#   .\docs\tools\deploy-and-verify.ps1 templateDesignerCMP -SkipDeploy     # only compare
param(
    [Parameter(Mandatory = $true, Position = 0)][string[]]$Component,
    [string]$Org = 'dxtemplates-scratch-30d',
    [switch]$SkipDeploy
)

$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo

# Some components contain non-ASCII text (emoji); read both sides as UTF-8 so they compare equal.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
function Normalize([string]$text) { return ($text -replace "`r`n", "`n").TrimEnd() }

$allMatch = $true
foreach ($name in $Component) {
    $folder = "force-app/main/default/lwc/$name"
    if (-not (Test-Path $folder)) { Write-Host "No such component folder: $folder" -ForegroundColor Red; $allMatch = $false; continue }

    if (-not $SkipDeploy) {
        Write-Host "== Deploy $name" -ForegroundColor Cyan
        sf project deploy start --source-dir $folder --target-org $Org 2>&1 | Select-String -Pattern 'Deploy|Error|error|Failed|Status' | Select-Object -First 6
    }

    Write-Host "== Compare $name with the org" -ForegroundColor Cyan
    $json = sf data query --use-tooling-api -q "SELECT FilePath, Source, LastModifiedDate FROM LightningComponentResource WHERE FilePath LIKE 'lwc/$name/%'" --target-org $Org --json 2>$null | Out-String | ConvertFrom-Json
    $remote = @{}
    foreach ($record in $json.result.records) { $remote[$record.FilePath] = $record }

    foreach ($file in Get-ChildItem $folder -File | Where-Object { $_.Extension -in '.js', '.html', '.css' }) {
        $path = "lwc/$name/$($file.Name)"
        if (-not $remote.ContainsKey($path)) { Write-Host "  MISSING in org: $path" -ForegroundColor Red; $allMatch = $false; continue }
        $same = (Normalize (Get-Content $file.FullName -Raw -Encoding UTF8)) -eq (Normalize $remote[$path].Source)
        if ($same) { Write-Host "  MATCH   $path   (org copy saved $($remote[$path].LastModifiedDate))" -ForegroundColor Green }
        else { Write-Host "  DIFFERS $path" -ForegroundColor Red; $allMatch = $false }
    }
}

if ($allMatch) {
    Write-Host ''
    Write-Host 'The org holds the local code. If the page still behaves the old way, the browser is serving a cached copy:' -ForegroundColor Yellow
    Write-Host '  Cause: the browser caches component code for a year (Cache-Control immutable). Run docs/tools/refresh-cached-component-code.js in the page, then reload plainly (docs/roadmap/review-later.md, RL-1).' -ForegroundColor Yellow
}
else {
    Write-Host ''
    Write-Host 'The org does NOT hold the local code for at least one file: fix the deploy first.' -ForegroundColor Red
    exit 1
}
