# Downloads a generated PDF attachment from the scratch org and stores its text as a regression baseline.
# Usage: ./capture-baseline.ps1 -Label grant-proposal -AttachmentId 00P... [-Org dxtemplates-scratch-30d] [-OutDir <dir>]
# Compare later with: ./capture-baseline.ps1 -Label grant-proposal -AttachmentId <new id> -OutDir <other dir>; diff the two .txt files.
param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][string]$AttachmentId,
    [string]$Org = 'dxtemplates-scratch-30d',
    [string]$OutDir = $PSScriptRoot
)
New-Item -ItemType Directory -Force $OutDir | Out-Null
$pdf = Join-Path $OutDir "$Label.pdf"
$txt = Join-Path $OutDir "$Label.txt"
sf api request rest "/services/data/v61.0/sobjects/Attachment/$AttachmentId/Body" --target-org $Org --stream-to-file $pdf 2>$null | Out-Null
pdftotext -layout $pdf $txt
$pages = ([IO.File]::ReadAllText($txt).ToCharArray() | Where-Object { $_ -eq [char]12 }).Count
"{0}: {1} bytes, {2} pages, {3} text lines" -f $Label, (Get-Item $pdf).Length, $pages, (Get-Content $txt).Count
