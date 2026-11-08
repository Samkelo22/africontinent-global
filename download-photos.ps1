# Download the Unsplash photos used by the Africontinent Global website
# and switch every page to use the local copies. No Python needed.
#
# How to run (in PowerShell, inside the website folder next to index.html):
#     powershell -ExecutionPolicy Bypass -File .\download-photos.ps1
#
# Safe to run again: photos already downloaded are skipped.
# Photos are from Unsplash, free for commercial use under the Unsplash License (https://unsplash.com/license).

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ProgressPreference = "SilentlyContinue"

# Unsplash photo id -> file name, width to download
$photos = @{
  "1590496793907-4d66e2994b4d" = @("intro-cargo-ship-dusk", 2000)
  "1636706519609-988babca3dd5" = @("johannesburg-skyline", 2200)
  "1604348489791-f95132c5d8c0" = @("city-skyline-sunset", 2000)
  "1578575437130-527eed3abbec" = @("cargo-ships-pier", 2000)
  "1553413077-190dd305871c"    = @("warehouse", 2000)
  "1611746351408-c0a1346be8e8" = @("truck-on-road", 2000)
  "1590497008432-598f04441de8" = @("container-port-cranes", 2000)
  "1511578194003-00c80e42dc9b" = @("aerial-containers", 2000)
  "1621060344848-262c81b806a2" = @("business-partners", 1200)
  "1721622045835-51a5447f281c" = @("building-materials-steel-pipes", 1000)
  "1426927308491-6380b6a9936f" = @("hardware-tools", 1000)
  "1518181835702-6eef8b4b2113" = @("electrical-cable", 1000)
  "1509390144018-eeaf65052242" = @("industrial-transformer", 1000)
  "1594771804886-a933bb2d609b" = @("agriculture-tractor", 1000)
  "1587293852726-70cdb56c2866" = @("general-supplies-warehouse", 1000)
}

$here   = Split-Path -Parent $MyInvocation.MyCommand.Path
$outDir = Join-Path $here "assets\images"
$pattern = 'https://images\.unsplash\.com/photo-([0-9a-f]+-[0-9a-f]+)\?[^"''\)\s]*'
$utf8 = New-Object System.Text.UTF8Encoding $false

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$pages = Get-ChildItem -Path $here -Filter *.html
if (-not $pages) { Write-Host "No .html files found. Put this script next to index.html."; exit 1 }

# Collect the photo ids used in the pages
$used = @{}
foreach ($p in $pages) {
  $text = [System.IO.File]::ReadAllText($p.FullName)
  foreach ($m in [regex]::Matches($text, $pattern)) { $used[$m.Groups[1].Value] = $true }
}
Write-Host "Found $($used.Count) photos across $($pages.Count) pages.`n"

# Download each photo once
$ok = @{}
foreach ($id in $used.Keys) {
  if ($photos.ContainsKey($id)) { $name = $photos[$id][0]; $width = $photos[$id][1] }
  else { $name = "photo-$id"; $width = 1600 }
  $file = Join-Path $outDir "$name.jpg"
  if ((Test-Path $file) -and ((Get-Item $file).Length -gt 10000)) {
    Write-Host "  already have $name.jpg"
    $ok[$id] = "assets/images/$name.jpg"
    continue
  }
  $url = "https://images.unsplash.com/photo-$id" + "?auto=format&fit=crop&w=$width&q=80&fm=jpg"
  try {
    Invoke-WebRequest -Uri $url -OutFile $file -UseBasicParsing -UserAgent "Mozilla/5.0"
    $kb = [math]::Round((Get-Item $file).Length / 1KB)
    Write-Host "  downloaded $name.jpg ($kb KB)" -ForegroundColor Green
    $ok[$id] = "assets/images/$name.jpg"
  } catch {
    Write-Host "  FAILED $name : $($_.Exception.Message)" -ForegroundColor Red
  }
}

# Point the pages at the local files
foreach ($p in $pages) {
  $html = [System.IO.File]::ReadAllText($p.FullName)
  $new = [regex]::Replace($html, $pattern, {
    param($m)
    if ($ok.ContainsKey($m.Groups[1].Value)) { $ok[$m.Groups[1].Value] } else { $m.Value }
  })
  if ($new -ne $html) {
    [System.IO.File]::WriteAllText($p.FullName, $new, $utf8)
    Write-Host "  updated $($p.Name)"
  }
}

$missing = $used.Count - $ok.Count
if ($missing -eq 0) { Write-Host "`nDone. All photos are now in assets\images." -ForegroundColor Green }
else { Write-Host "`nDone, but $missing photo(s) failed. Run the script again to retry them." -ForegroundColor Yellow }
