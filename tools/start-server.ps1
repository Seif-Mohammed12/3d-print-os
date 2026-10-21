# Runs the whole backend on this PC and publishes the API with Tailscale Funnel:
#   slicer (geometry service) on 127.0.0.1:8000  - private, only the API calls it
#   API on 127.0.0.1:3000                         - public via https://<machine>.<tailnet>.ts.net
#
# Usage (from the repo root):  powershell -ExecutionPolicy Bypass -File tools\start-server.ps1
# Needs: root .env (DATABASE_URL, Supabase, JWT secrets), apps/geometry-service/.env
# (SERVICE_API_KEY, SLICER_EXECUTABLE), a built API (pnpm --filter "@3d-print-os/api..." run build),
# the geometry-service .venv, and Tailscale signed in with Funnel allowed for this machine.

param([string]$WebOrigin = 'https://3d-print-os.vercel.app')

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$service = Join-Path $root 'apps\geometry-service'
$apiDir = Join-Path $root 'apps\api'
$python = Join-Path $service '.venv\Scripts\python.exe'
$tailscale = 'C:\Program Files\Tailscale\tailscale.exe'
$logDir = Join-Path $env:TEMP '3d-print-os-server'
New-Item -ItemType Directory -Force $logDir | Out-Null

foreach ($path in @((Join-Path $root '.env'), (Join-Path $service '.env'), $python, (Join-Path $apiDir 'dist\main.js'), $tailscale)) {
    if (-not (Test-Path $path)) { throw "Missing $path (see docs/DEPLOYMENT.md)." }
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
$env:REDIS_URL = ''
$env:CORS_ORIGINS = "$WebOrigin,http://localhost:5173"
$env:GEOMETRY_SERVICE_URL = 'http://127.0.0.1:8000/api/v1'
$env:GEOMETRY_SERVICE_KEY = $serviceKey

Write-Host 'Starting the API (127.0.0.1:3000) ...'
$api = Start-Process -FilePath 'node' -WorkingDirectory $apiDir -PassThru -WindowStyle Hidden `
    -ArgumentList 'dist/main.js' `
    -RedirectStandardOutput (Join-Path $logDir 'api.log') -RedirectStandardError (Join-Path $logDir 'api.err.log')

try {
    Wait-Healthy 'http://127.0.0.1:8000/' 'The slicer'
    Wait-Healthy 'http://127.0.0.1:3000/api/v1/health' 'The API'

    Write-Host 'Publishing the API with Tailscale Funnel ...'
    & $tailscale funnel --bg 3000 | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'Tailscale Funnel failed. Allow Funnel for this machine in the Tailscale admin console.' }
    $dns = ((& $tailscale status --json | ConvertFrom-Json).Self.DNSName).TrimEnd('.')

    Write-Host ''
    Write-Host 'Backend is online.' -ForegroundColor Green
    Write-Host "  API:  https://$dns/api/v1   (Vercel VITE_API_BASE_URL)" -ForegroundColor Cyan
    Write-Host "  Logs: $logDir"
    Write-Host ''
    Write-Host 'Keep this window open. Press Ctrl+C to stop.'
    while (-not $api.HasExited -and -not $slicer.HasExited) { Start-Sleep -Seconds 2 }
    if ($api.HasExited) { Write-Warning "The API stopped. See $logDir\api.err.log" }
    if ($slicer.HasExited) { Write-Warning "The slicer stopped. See $logDir\slicer.err.log" }
}
finally {
    & $tailscale funnel --https=443 off 2>$null | Out-Null
    foreach ($p in @($api, $slicer)) { if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force } }
    Write-Host 'Stopped (Funnel turned off).'
}
