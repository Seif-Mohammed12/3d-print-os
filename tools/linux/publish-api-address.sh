#!/usr/bin/env bash
# Linux version of tools/publish-api-address.ps1: writes { "apiBaseUrl": ... } to the public
# Supabase Storage file the web app reads on load.
#   sudo /usr/local/lib/printos/publish-api-address.sh https://<host>/api/v1
set -euo pipefail
ENV_FILE=${ENV_FILE:-/opt/3d-print-os/.env}
BUCKET=runtime-config

url=${1:?Usage: publish-api-address.sh <api base url>}
url=${url%/}
case "$url" in https://*) ;; *) echo "The address must start with https://" >&2; exit 1 ;; esac
case "$url" in *[!A-Za-z0-9.:/_-]*) echo "Unexpected character in the address" >&2; exit 1 ;; esac

env_value() { sed -n "s/^$1=//p" "$ENV_FILE" | head -1 | sed -E "s/[[:space:]]+$//; s/^[\"']//; s/[\"']$//"; }
base=$(env_value SUPABASE_URL)
base=${base%/}
key=$(env_value SUPABASE_SERVICE_ROLE_KEY)
if [ -z "$base" ] || [ -z "$key" ]; then
  echo "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in $ENV_FILE" >&2
  exit 1
fi

# The key goes through stdin, so it never shows up in the process list.
call() { # path, JSON body, extra curl config lines
  local body=${2//\"/\\\"}
  curl -s -m 30 -o /dev/null -w '%{http_code}' -K - <<EOF
url = "$base/storage/v1/$1"
request = "POST"
header = "Authorization: Bearer $key"
header = "apikey: $key"
header = "Content-Type: application/json"
$3
data-binary = "$body"
EOF
}

# Public bucket for the address file; an "already exists" answer is fine.
status=$(call bucket "{\"id\":\"$BUCKET\",\"name\":\"$BUCKET\",\"public\":true}" "")
case "$status" in 2?? | 400 | 409) ;; *) echo "Creating the bucket failed: HTTP $status" >&2; exit 1 ;; esac

status=$(call "object/$BUCKET/api.json" \
  "{\"apiBaseUrl\":\"$url\",\"updatedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
  $'header = "x-upsert: true"\nheader = "cache-control: max-age=0"')
case "$status" in 2??) ;; *) echo "Publishing failed: HTTP $status" >&2; exit 1 ;; esac
echo "Published $url to $base/storage/v1/object/public/$BUCKET/api.json"
