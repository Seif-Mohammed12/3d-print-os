# Runs the whole backend on this PC for testing and publishes the API with a free Cloudflare
# quick tunnel:
#   slicer (geometry service) on 127.0.0.1:8000  - private, only the API calls it
#   API on 127.0.0.1:3000                         - public via https://<random>.trycloudflare.com
#
# It does not touch Tailscale or any other app's ports. Quick-tunnel addresses change on every
# start: set the printed address as VITE_API_BASE_URL on Vercel and redeploy.
#
# Usage (from the repo root):  powershell -ExecutionPolicy Bypass -File tools\start-server.ps1
# Needs: root .env (DATABASE_URL, Supabase, JWT secrets), apps/geometry-service/.env
# (SERVICE_API_KEY, SLICER_EXECUTABLE), a built API (pnpm --filter "@3d-print-os/api..." run build),
# the geometry-service .venv, and cloudflared (winget install --id Cloudflare.cloudflared).

param([string]$WebOrigin = 'https://3d-print-os.vercel.app')

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$service = Join-Path $root 'apps\geometry-service'
$apiDir = Join-Path $root 'apps\api'
$python = Join-Path $service '.venv\Scripts\python.exe'
$logDir = Join-Path $env:TEMP '3d-print-os-server'
New-Item -ItemType Directory -Force $logDir | Out-Null

$cloudflared = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cloudflared -and (Test-Path 'C:\Program Files (x86)\cloudflared\cloudflared.exe')) {
    $cloudflared = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
}
if (-not $cloudflared) { throw 'cloudflared not found. Install it: winget install --id Cloudflare.cloudflared' }

foreach ($path in @((Join-Path $root '.env'), (Join-Path $service '.env'), $python, (Join-Path $apiDir 'dist\main.js'))) {
    if (-not (Test-Path $path)) { throw "Missing $path (see docs/DEPLOYMENT.md)." }
}
foreach ($port in 3000, 8000) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        throw "Port $port is already in use. Stop whatever is using it first."
    }
}

$serviceKey = (Select-String -Path (Join-Path $service '.env') -Pattern '^SERVICE_API_KEY=(.+)$').Matches[0].Groups[1].Value
if (-not $serviceKey) { throw 'SERVICE_API_KEY is empty in apps/geometry-service/.env' }

function Wait-Healthy([string]$url, [string]$name) {
    for ($i = 0; $i -lt 60; $i++) {
        try { if ((Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 $url).StatusCode -eq 200) { return } } catch { }
        Start-Sleep -Seconds 1
    }
    throw "$name did not become healthy. Logs: $logDir"
}

Write-Host 'Starting the slicer (private, 127.0.0.1:8000) ...'
$slicer = Start-Process -FilePath $python -WorkingDirectory $service -PassThru -WindowStyle Hidden `
    -ArgumentList '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000' `
    -RedirectStandardOutput (Join-Path $logDir 'slicer.log') -RedirectStandardError (Join-Path $logDir 'slicer.err.log')

# The API reads the root .env itself; these override it for this machine.
$env:NODE_ENV = 'production'
$env:API_PORT = '3000'
$env:CORS_ORIGINS = "$WebOrigin,http://localhost:5173"
$env:GEOMETRY_SERVICE_URL = 'http://127.0.0.1:8000/api/v1'
$env:GEOMETRY_SERVICE_KEY = $serviceKey

Write-Host 'Starting the API (127.0.0.1:3000) ...'
$api = Start-Process -FilePath 'node' -WorkingDirectory $apiDir -PassThru -WindowStyle Hidden `
    -ArgumentList 'dist/main.js' `
    -RedirectStandardOutput (Join-Path $logDir 'api.log') -RedirectStandardError (Join-Path $logDir 'api.err.log')

$tunnel = $null
try {
    Wait-Healthy 'http://127.0.0.1:8000/' 'The slicer'
    Wait-Healthy 'http://127.0.0.1:3000/api/v1/health' 'The API'

    Write-Host 'Opening the Cloudflare tunnel for the API ...'
    $tunnelLog = Join-Path $logDir 'tunnel.log'
    Remove-Item $tunnelLog -ErrorAction SilentlyContinue
    $tunnel = Start-Process -FilePath $cloudflared -PassThru -WindowStyle Hidden `
        -ArgumentList 'tunnel', '--no-autoupdate', '--url', 'http://127.0.0.1:3000' `
        -RedirectStandardOutput (Join-Path $logDir 'tunnel.out.log') -RedirectStandardError $tunnelLog

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
    Write-Host 'Backend is online.' -ForegroundColor Green
    Write-Host "  API:  $url/api/v1   (set as Vercel VITE_API_BASE_URL, then redeploy)" -ForegroundColor Cyan
    Write-Host "  Logs: $logDir"
    Write-Host ''
    Write-Host 'Keep this window open. Press Ctrl+C to stop.'
    while (-not $api.HasExited -and -not $slicer.HasExited -and -not $tunnel.HasExited) { Start-Sleep -Seconds 2 }
    if ($api.HasExited) { Write-Warning "The API stopped. See $logDir\api.err.log" }
    if ($slicer.HasExited) { Write-Warning "The slicer stopped. See $logDir\slicer.err.log" }
    if ($tunnel.HasExited) { Write-Warning "The tunnel stopped. See $logDir\tunnel.log" }
}
finally {
    foreach ($p in @($tunnel, $api, $slicer)) { if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force } }
    Write-Host 'Stopped.'
}
