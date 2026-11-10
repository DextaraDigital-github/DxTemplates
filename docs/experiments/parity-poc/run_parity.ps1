# PARITY PoC driver. Step 1 (create the Documents) and step 2 (render both ways) for every template of the corpus, one run each.
# Usage: powershell -File docs/experiments/parity-poc/run_parity.ps1 -Org dxtemplates-scratch-30d [-Only 'Invoice Template']
param([string]$Org = 'dxtemplates-scratch-30d', [string]$Only = '', [switch]$SkipGenerate)
$account = '001RL00003CoThZYAV'; $opp = '006RL00000VwyMvYAJ'; $case = '500RL00000i4TpOYAU'
$corpus = @(
  @('Grant Proposal',$account), @('Invoice Template',$account), @('Merge Field Test',$account), @('Non-Disclosure Agreements (NDAs)',$account),
  @('ZZ Heavy Combined',$account), @('ZZ Placeholders',$account), @('ZZ Flow Placeholders',$account), @('ZZ Clone RO',$account),
  @('Contract Renewal',$opp), @('EMPLOYMENT CONTRACT',$opp), @('Legal Notice',$opp), @('Newsletter',$opp), @('Claim Form',$case))
if ($Only) { $corpus = $corpus | Where-Object { $_[0] -eq $Only } }
$step1 = Get-Content "$PSScriptRoot\1_generate.apex" -Raw
$step2 = Get-Content "$PSScriptRoot\2_render_topdf.apex" -Raw
function Run($code, $file) {
  $path = Join-Path $env:TEMP $file; $code | Set-Content $path
  return (sf apex run -o $Org -f $path 2>&1 | Out-String)
}
foreach ($c in $corpus) {
  if (-not $SkipGenerate) {
  $o1 = Run ($step1 -replace 'TEMPLATE_NAME', $c[0] -replace 'RECORD_ID', $c[1]) 'parity_1.apex'
  if ($o1 -notmatch 'PARITY queued') { Write-Output "STEP1 FAILED $($c[0]): $(($o1 -split "`n" | Select-String 'Exception|rror:' | Select-Object -First 1))"; continue }
  }
  $o2 = Run ($step2 -replace 'TEMPLATE_NAME', $c[0]) 'parity_2.apex'
  $line = ($o2 -split "`n" | Select-String 'PARITY done' | Select-Object -First 1)
  if ($line) { Write-Output ($line.Line -replace '^.*\|DEBUG\|','') } else { Write-Output "STEP2 FAILED $($c[0]): $(($o2 -split "`n" | Select-String 'Exception|rror:' | Select-Object -First 1))" }
}
