# Runs the slicer (geometry service) on this PC and exposes it through a free Cloudflare
# quick tunnel. Prints the address to put in Render as GEOMETRY_SERVICE_URL.
#
# Usage (from the repo root):  powershell -ExecutionPolicy Bypass -File tools\start-slicer.ps1
# Needs: apps/geometry-service/.env (SERVICE_API_KEY etc.), its .venv, and cloudflared.
# Quick-tunnel addresses change every time this starts: update Render when they do.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$service = Join-Path $root 'apps\geometry-service'
$python = Join-Path $service '.venv\Scripts\python.exe'
$logDir = Join-Path $env:TEMP '3d-print-os-slicer'
New-Item -ItemType Directory -Force $logDir | Out-Null

if (-not (Test-Path (Join-Path $service '.env'))) { throw "Missing $service\.env (see docs/DEPLOYMENT.md)." }
if (-not (Test-Path $python)) { throw "Missing $python. Create the venv and install requirements.txt first." }
$cloudflared = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cloudflared) {
    $candidate = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
    if (Test-Path $candidate) { $cloudflared = $candidate } else { throw 'cloudflared not found. Install it: winget install --id Cloudflare.cloudflared' }
}

$apiLog = Join-Path $logDir 'slicer.log'
$tunnelLog = Join-Path $logDir 'tunnel.log'
Remove-Item $apiLog, $tunnelLog -ErrorAction SilentlyContinue

Write-Host 'Starting the slicer on http://localhost:8000 ...'
$api = Start-Process -FilePath $python -WorkingDirectory $service -PassThru -WindowStyle Hidden `
    -ArgumentList '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000' `
    -RedirectStandardOutput $apiLog -RedirectStandardError "$apiLog.err"

Write-Host 'Opening the Cloudflare tunnel ...'
$tunnel = Start-Process -FilePath $cloudflared -PassThru -WindowStyle Hidden `
    -ArgumentList 'tunnel', '--no-autoupdate', '--url', 'http://localhost:8000' `
    -RedirectStandardOutput "$tunnelLog.out" -RedirectStandardError $tunnelLog

try {
    $url = $null
    for ($i = 0; $i -lt 60 -and -not $url; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Path $tunnelLog) {
            $match = Select-String -Path $tunnelLog -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1
            if ($match) { $url = $match.Matches[0].Value }
        }
    }
    if (-not $url) { throw "The tunnel did not start. See $tunnelLog" }

    Write-Host ''
    Write-Host 'Slicer is online.' -ForegroundColor Green
    Write-Host "  Render GEOMETRY_SERVICE_URL = $url/api/v1" -ForegroundColor Cyan
    Write-Host "  Health check: $url/api/v1/health"
    Write-Host "  Logs: $logDir"
    Write-Host ''
    Write-Host 'Keep this window open. Press Ctrl+C to stop.'
    while (-not $api.HasExited -and -not $tunnel.HasExited) { Start-Sleep -Seconds 2 }
    if ($api.HasExited) { Write-Warning "The slicer stopped. See $apiLog.err" }
    if ($tunnel.HasExited) { Write-Warning "The tunnel stopped. See $tunnelLog" }
}
finally {
    foreach ($p in @($api, $tunnel)) { if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force } }
    Write-Host 'Stopped.'
}
