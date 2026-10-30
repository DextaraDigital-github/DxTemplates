# Runs the checks for an LWC change in one go: Jest, the ESLint error count, and (optionally) a deploy.
# Usage (repo root, PowerShell):
#   .\docs\tools\verify-lwc.ps1            # tests + lint count
#   .\docs\tools\verify-lwc.ps1 -Deploy    # also deploys the lwc folder to the scratch org
# Do not use -Deploy while someone else is testing in the org's browser.
param(
    [switch]$Deploy,
    [string]$Org = 'dxtemplates-scratch-30d'
)

$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo

Write-Host '== Jest' -ForegroundColor Cyan
npx sfdx-lwc-jest 2>&1 | Select-String -Pattern 'Tests:|Test Suites:|FAIL|×'

Write-Host '== ESLint' -ForegroundColor Cyan
$env:ESLINT_USE_FLAT_CONFIG = 'false'
$out = Join-Path $env:TEMP 'lint_verify.json'
npx eslint force-app/main/default/lwc --ext .js -f json -o $out 2>$null
node -e "const p=require('path');const r=require(process.argv[1]);let e=0,d=0;const t=[];r.forEach(f=>{e+=f.errorCount;d+=f.messages.filter(m=>m.ruleId==='no-dupe-class-members').length;if(/__tests__/.test(f.filePath)&&f.errorCount)t.push(p.basename(f.filePath))});console.log('eslint errors:',e,'| no-dupe-class-members:',d);if(t.length)console.log('lint errors inside tests:',t.join(', '))" $out

if ($Deploy) {
    Write-Host "== Deploy to $Org" -ForegroundColor Cyan
    sf project deploy start --source-dir force-app/main/default/lwc --target-org $Org 2>&1 |
        Select-String -Pattern 'Status|Components:|Problem|Error' | Select-Object -Last 4
} else {
    Write-Host '(skipped deploy; use -Deploy)' -ForegroundColor DarkGray
}
