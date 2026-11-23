# shellcheck shell=bash
# Shared by install.sh and update.sh. Sourced, not run.

APP_DIR=/opt/3d-print-os
STATE_DIR=/var/lib/printos
LIB_DIR=/usr/local/lib/printos
SERVICE_USER=printos
FUNNEL_PORT=8443

say() { printf '\n== %s\n' "$*"; }
die() {
  printf '\nERROR: %s\n' "$*" >&2
  exit 1
}

require_root() { [ "$(id -u)" = 0 ] || die "Run this with sudo."; }

# Run the whole script on the printer-safe core at the lowest priority.
confine_self() {
  [ -z "${PRINTOS_CONFINED:-}" ] || return 0
  exec systemd-run --scope --quiet -p AllowedCPUs=2-3 -p CPUWeight=10 -- \
    env PRINTOS_CONFINED=1 nice -n 19 ionice -c 3 bash "$0" "$@"
}

refuse_while_printing() {
  local state
  [ "${FORCE:-0}" != 1 ] || return 0
  state=$(curl -s -m 5 'http://127.0.0.1:7125/printer/objects/query?print_stats' |
    python3 -I -c 'import json,sys; print(json.load(sys.stdin)["result"]["status"]["print_stats"]["state"])' 2>/dev/null) || true
  case "$state" in
    printing | paused) die "A print is $state. Try again when it has finished (or use --force)." ;;
  esac
}

# Run a command as printos: no view of /home, writes only to the app and its state directory,
# and confined to the same core and priority as the services.
as_printos() {
  systemd-run --quiet --wait --pipe --collect --service-type=exec \
    -p User=$SERVICE_USER -p Group=$SERVICE_USER -p WorkingDirectory="${CWD:-$APP_DIR}" \
    -p NoNewPrivileges=yes -p PrivateTmp=yes -p ProtectHome=yes -p ProtectSystem=strict \
    -p "ReadWritePaths=$APP_DIR $STATE_DIR" \
    -p AllowedCPUs=2-3 -p Nice=19 -p CPUWeight=10 -p IOSchedulingClass=idle -p MemoryMax=3G \
    -E HOME=$STATE_DIR -E CI=true -E COREPACK_ENABLE_DOWNLOAD_PROMPT=0 -E GIT_TERMINAL_PROMPT=0 \
    /bin/bash -euo pipefail -c "$1"
}

build_app() {
  say "Installing Node packages and building the API"
  as_printos 'pnpm install --frozen-lockfile --reporter=append-only
    pnpm --filter "@3d-print-os/api..." run build'
  say "Installing the slicer service's Python packages"
  CWD=$APP_DIR/apps/geometry-service as_printos \
    '[ -x .venv/bin/python ] || python3 -m venv .venv
    .venv/bin/pip install -q --disable-pip-version-check -r requirements.txt'
}

wait_http() {
  local _
  for _ in $(seq 1 90); do
    ! curl -fs -m 5 -o /dev/null "$1" || return 0
    sleep 1
  done
  die "$2 is not answering at $1. See: journalctl -u printos-api -u printos-geometry -n 50"
}

restart_and_check() {
  say "Restarting the services"
  systemctl restart printos-geometry.service
  wait_http http://127.0.0.1:8000/ "The slicer"
  systemctl restart printos-api.service
  wait_http http://127.0.0.1:3000/api/v1/health "The API"
  wait_http http://127.0.0.1:3000/api/v1/health/ready "The API readiness check"
  echo "Healthy."
}
