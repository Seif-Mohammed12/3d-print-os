# Publishes the backend's current public API address so the deployed web app finds it without a
# rebuild. Writes { "apiBaseUrl": "<url>" } to the public Supabase Storage file
#   <SUPABASE_URL>/storage/v1/object/public/runtime-config/api.json
# which the web app reads on load (VITE_RUNTIME_CONFIG_URL). Creates the public bucket if missing.
#
# tools\start-server.ps1 runs this after every tunnel start. To run it by hand (from the repo root):
#   powershell -ExecutionPolicy Bypass -File tools\publish-api-address.ps1 -ApiBaseUrl https://<random>.trycloudflare.com/api/v1
# Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the root .env.

param([Parameter(Mandatory = $true)][string]$ApiBaseUrl)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$bucket = 'runtime-config'
$file = 'api.json'

function Get-EnvValue([string]$name) {
    $match = Select-String -Path (Join-Path $root '.env') -Pattern "^$name=(.*)$" | Select-Object -First 1
    if (-not $match) { return $null }
    return $match.Matches[0].Groups[1].Value.Trim().Trim('"').Trim("'")
}

$supabaseUrl = (Get-EnvValue 'SUPABASE_URL')
$serviceKey = Get-EnvValue 'SUPABASE_SERVICE_ROLE_KEY'
if (-not $supabaseUrl -or -not $serviceKey) { throw 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the root .env' }
$supabaseUrl = $supabaseUrl.TrimEnd('/')
$headers = @{ Authorization = "Bearer $serviceKey"; apikey = $serviceKey }

# Public bucket for the address file; an "already exists" answer is fine.
try {
    Invoke-RestMethod -Method Post -Uri "$supabaseUrl/storage/v1/bucket" -Headers $headers `
        -ContentType 'application/json' -Body (@{ id = $bucket; name = $bucket; public = $true } | ConvertTo-Json) | Out-Null
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -ne 400 -and $status -ne 409) { throw }
}

$body = @{ apiBaseUrl = $ApiBaseUrl.TrimEnd('/'); updatedAt = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json
$uploadHeaders = $headers + @{ 'x-upsert' = 'true'; 'cache-control' = 'max-age=0' }
Invoke-RestMethod -Method Post -Uri "$supabaseUrl/storage/v1/object/$bucket/$file" -Headers $uploadHeaders `
    -ContentType 'application/json' -Body $body | Out-Null

Write-Host "Published $ApiBaseUrl to $supabaseUrl/storage/v1/object/public/$bucket/$file"
