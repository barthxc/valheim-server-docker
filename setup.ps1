# First-time setup for Windows (PowerShell): creates .env and valheim.env from the examples,
# with random passwords, the right PROJECT_DIR for Docker Desktop and your LAN IP.
# Never overwrites files that already exist.  Run:  powershell -ExecutionPolicy Bypass -File .\setup.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function New-Secret([int]$bytes) {
  $b = New-Object byte[] $bytes
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  -join ($b | ForEach-Object { '{0:x2}' -f $_ })
}
function Set-Var([string]$file, [string]$key, [string]$value) {
  $lines = Get-Content $file | ForEach-Object { if ($_ -match "^$key=") { "$key=$value" } else { $_ } }
  [IO.File]::WriteAllText((Join-Path $PSScriptRoot $file), (($lines -join "`n") + "`n"))
}

# C:\Users\You\valheim -> /run/desktop/mnt/host/c/Users/You/valheim (path seen by Docker Desktop)
$here = (Get-Location).Path
$projectDir = "/run/desktop/mnt/host/" + $here.Substring(0, 1).ToLower() + ($here.Substring(2) -replace '\\', '/')

$ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)' -and $_.PrefixOrigin -ne 'WellKnown' } |
  Sort-Object InterfaceMetric | Select-Object -First 1).IPAddress

if (Test-Path .env) { Write-Host "- .env already exists, leaving it untouched" }
else {
  Copy-Item .env.example .env
  $panelPass = New-Secret 6
  Set-Var .env PROJECT_DIR $projectDir
  Set-Var .env RCON_PASSWORD (New-Secret 16)
  Set-Var .env PANEL_PASSWORD $panelPass
  if ($ip) { Set-Var .env LOCAL_ADDRESS "${ip}:2456" }
  Write-Host "- Created .env  (PROJECT_DIR=$projectDir, LOCAL_ADDRESS=${ip}:2456)"
  Write-Host "  Panel password: $panelPass   (change it in .env if you like)"
}

if (Test-Path valheim.env) { Write-Host "- valheim.env already exists, leaving it untouched" }
else {
  Copy-Item valheim.env.example valheim.env
  $gamePass = New-Secret 4
  Set-Var valheim.env SERVER_PASS $gamePass
  Write-Host "- Created valheim.env  (game password: $gamePass)"
}

New-Item -ItemType Directory -Force data/config, data/opt | Out-Null
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Review .env and valheim.env (server name, world, time zone...)"
Write-Host "  2. docker compose up -d --build"
Write-Host "  3. Open http://localhost:8082"
