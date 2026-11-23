#!/usr/bin/env bash
# Sets up the 3D Print OS backend on the printer laptop. Safe to re-run.
#
#   sudo ./install.sh [--branch main] [--secrets DIR] [--skip-funnel] [--publish] [--force]
#
# --secrets DIR  holds root.env and geometry.env copied from the PC; they are moved into place and
#                the copies deleted. Needed on the first run, or to replace the secrets.
# --skip-funnel  leave Tailscale alone.
# --publish      also publish the fixed Funnel address for the web app.
# --force        run even during a print.
#
# It never restarts or edits Klipper, Moonraker, nginx, JARVIS services, ufw or existing Tailscale
# Serve entries. Klipper only gets a drop-in that raises its CPU weight.
set -euo pipefail
HERE=$(dirname "$(readlink -f "$0")")
. "$HERE/common.sh"
require_root
confine_self "$@"

REPO=https://github.com/Seif-Mohammed12/3d-print-os.git
BRANCH=main
SECRETS=
FUNNEL=1
PUBLISH=0
while [ $# -gt 0 ]; do
  case "$1" in
    --branch) BRANCH=${2:?}; shift 2 ;;
    --secrets) SECRETS=$(readlink -f "${2:?}"); shift 2 ;;
    --skip-funnel) FUNNEL=0; shift ;;
    --publish) PUBLISH=1; shift ;;
    --force) FORCE=1; shift ;;
    *) die "Unknown option $1" ;;
  esac
done
case "$BRANCH" in -* | *[!A-Za-z0-9._/-]*) die "Not a branch name: $BRANCH" ;; esac

# Same build as the PC's PrusaSlicer, so profiles behave the same.
SLICER_VERSION=2.6.1
SLICER_FILE=PrusaSlicer-2.6.1+linux-x64-GTK3-202309060711.AppImage
SLICER_SHA256=a070ea2a8f461ff7afd7fdad5711856fae5a79a502846ff683058cf72fdbd653
SLICER_DIR=/opt/prusaslicer-$SLICER_VERSION
SLICER_BIN=$SLICER_DIR/usr/bin/prusa-slicer

# ---------------------------------------------------------------------------
say "Checking that nothing else uses our ports"
refuse_while_printing
for pair in 3000:printos-api 8000:printos-geometry; do
  port=${pair%%:*}
  unit=${pair#*:}
  if ss -ltnH "sport = :$port" | grep -q . && ! systemctl is-active -q "$unit.service"; then
    die "Port $port is already in use by another program. Nothing was changed."
  fi
done

# What Tailscale has on our Funnel port: none, ours, or other.
funnel_state() {
  tailscale serve status --json | python3 -I -c '
import json, sys
port = sys.argv[1]
cfg = json.loads(sys.stdin.read() or "{}") or {}
web = {k: v for k, v in (cfg.get("Web") or {}).items() if k.endswith(":" + port)}
if port not in (cfg.get("TCP") or {}) and not web:
    print("none")
else:
    ours = web and all(v.get("Handlers") == {"/": {"Proxy": "http://127.0.0.1:3000"}} for v in web.values())
    public = any(k.endswith(":" + port) and on for k, on in (cfg.get("AllowFunnel") or {}).items())
    print("ours" if ours and public else "other")
' "$FUNNEL_PORT"
}
if [ "$FUNNEL" = 1 ]; then
  funnel=$(funnel_state)
  [ "$funnel" != other ] || die "Tailscale already uses port $FUNNEL_PORT for something else. Nothing was changed."
  if [ "$funnel" = none ] && ss -ltnH "sport = :$FUNNEL_PORT" | grep -q .; then
    die "Port $FUNNEL_PORT is already in use. Nothing was changed."
  fi
fi
if [ -n "$SECRETS" ]; then
  if [ ! -f "$SECRETS/root.env" ] || [ ! -f "$SECRETS/geometry.env" ]; then
    die "$SECRETS must hold root.env and geometry.env."
  fi
elif [ ! -f "$APP_DIR/.env" ] || [ ! -f "$APP_DIR/apps/geometry-service/.env" ]; then
  die "The first install needs --secrets DIR. Nothing was changed."
fi

# ---------------------------------------------------------------------------
say "Keeping the laptop awake and on Wi-Fi"
systemctl mask --quiet sleep.target suspend.target hibernate.target hybrid-sleep.target suspend-then-hibernate.target
if ! NetworkManager --print-config 2>/dev/null | grep -q '^wifi.powersave=2'; then
  printf '[connection]\nwifi.powersave = 2\n' >/etc/NetworkManager/conf.d/zz-printos-wifi-powersave.conf
  nmcli general reload conf
fi
wifi=$(nmcli -t -f UUID,TYPE connection show --active | awk -F: '$2 == "802-11-wireless" { print $1; exit }')
[ -z "$wifi" ] || nmcli connection modify uuid "$wifi" connection.autoconnect yes connection.autoconnect-retries 0
grep -rqsE '^HandleLidSwitch=ignore' /etc/systemd/logind.conf /etc/systemd/logind.conf.d ||
  echo "WARNING: logind does not ignore the lid. Not changed."

# ---------------------------------------------------------------------------
say "Service user"
id -u $SERVICE_USER >/dev/null 2>&1 ||
  useradd --system --user-group --home-dir $STATE_DIR --no-create-home --shell /usr/sbin/nologin $SERVICE_USER
install -d -o $SERVICE_USER -g $SERVICE_USER -m 750 $STATE_DIR
[ -d $APP_DIR ] || install -d -o $SERVICE_USER -g $SERVICE_USER -m 750 $APP_DIR

# ---------------------------------------------------------------------------
say "Node 22, pnpm and Python"
export DEBIAN_FRONTEND=noninteractive NEEDRESTART_SUSPEND=1
need=()
case "$(/usr/bin/node -v 2>/dev/null)" in
  v22.*) ;;
  *)
    tmp=$(mktemp -d)
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource.gpg.key -o "$tmp/key.asc"
    gpg --batch --homedir "$tmp" --show-keys --with-colons "$tmp/key.asc" 2>/dev/null |
      grep '^fpr:.*:6F71F525282841EEDAF851B42F59B5F99B1BE0B4:' >/dev/null || die "Unexpected NodeSource signing key."
    gpg --batch --yes --homedir "$tmp" --dearmor -o /usr/share/keyrings/nodesource.gpg "$tmp/key.asc"
    chmod 644 /usr/share/keyrings/nodesource.gpg
    rm -rf "$tmp"
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
      >/etc/apt/sources.list.d/nodesource.list
    need+=(nodejs)
    ;;
esac
for pkg in python3-venv git curl ca-certificates; do
  dpkg -s "$pkg" >/dev/null 2>&1 || need+=("$pkg")
done
if [ ${#need[@]} -gt 0 ]; then
  apt-get update -q
  apt-get install -y -q --no-install-recommends "${need[@]}"
fi
case "$(/usr/bin/node -v)" in v22.*) ;; *) die "Node 22 did not install." ;; esac
corepack enable

# ---------------------------------------------------------------------------
say "PrusaSlicer $SLICER_VERSION"
if [ ! -x "$SLICER_BIN" ]; then
  tmp=$(mktemp -d)
  curl -fsSL -o "$tmp/slicer.AppImage" \
    "https://github.com/prusa3d/PrusaSlicer/releases/download/version_$SLICER_VERSION/${SLICER_FILE/+/%2B}"
  echo "$SLICER_SHA256  $tmp/slicer.AppImage" | sha256sum -c --quiet || die "PrusaSlicer does not match its checksum."
  chmod +x "$tmp/slicer.AppImage"
  (cd "$tmp" && ./slicer.AppImage --appimage-extract >/dev/null)
  rm -rf "$SLICER_DIR"
  mv "$tmp/squashfs-root" "$SLICER_DIR"
  chown -R root:root "$SLICER_DIR"
  chmod -R a+rX,go-w "$SLICER_DIR"
  rm -rf "$tmp"
fi

# ---------------------------------------------------------------------------
say "Code ($BRANCH)"
if [ -d $APP_DIR/.git ]; then
  as_printos "git fetch --prune origin
    git checkout -q '$BRANCH'
    git pull --ff-only
    git log --oneline -1"
else
  as_printos "git clone --branch '$BRANCH' '$REPO' .
    git log --oneline -1"
fi

# ---------------------------------------------------------------------------
say "Settings and secrets"
set_env() { # file key value (shell builtins only, so values never reach a process list)
  local tmp
  tmp=$(mktemp "$1.XXXXXX")
  { grep -v "^$2=" "$1" || true; } >"$tmp"
  printf '%s=%s\n' "$2" "$3" >>"$tmp"
  mv "$tmp" "$1"
}
env_of() { sed -n "s/^$2=//p" "$1" | head -1 | sed -E "s/[[:space:]]+$//; s/^[\"']//; s/[\"']$//"; }
ROOT_ENV=$APP_DIR/.env
GEO_ENV=$APP_DIR/apps/geometry-service/.env
umask 077
if [ -n "$SECRETS" ]; then
  # awk drops Windows line ends and guarantees a final newline.
  awk '{ sub(/\r$/, ""); print }' "$SECRETS/root.env" >"$ROOT_ENV"
  awk '{ sub(/\r$/, ""); print }' "$SECRETS/geometry.env" >"$GEO_ENV"
fi
key=$(env_of "$GEO_ENV" SERVICE_API_KEY)
[ -n "$key" ] || die "SERVICE_API_KEY is empty."
host=$(env_of "$ROOT_ENV" SUPABASE_URL)
host=${host#*://}
host=${host%%/*}
[ -n "$host" ] || die "SUPABASE_URL is empty."
set_env "$ROOT_ENV" GEOMETRY_SERVICE_KEY "$key"
set_env "$GEO_ENV" ENVIRONMENT production
set_env "$GEO_ENV" SLICER_EXECUTABLE "$SLICER_BIN"
set_env "$GEO_ENV" SLICER_MAX_PARALLEL 1
set_env "$GEO_ENV" SLICER_ALLOWED_DOWNLOAD_HOSTS "$host"
unset key
chown $SERVICE_USER:$SERVICE_USER "$ROOT_ENV" "$GEO_ENV"
chmod 600 "$ROOT_ENV" "$GEO_ENV"
umask 022
if [ -n "$SECRETS" ]; then
  shred -u "$SECRETS/root.env" "$SECRETS/geometry.env"
  rmdir --ignore-fail-on-non-empty "$SECRETS"
fi

build_app

say "Slicing a test model"
CWD=$APP_DIR/apps/geometry-service as_printos "
  d=\$(mktemp -d)
  mkdir \$d/data
  .venv/bin/python -c \"import trimesh; trimesh.creation.torus(22, 8, major_sections=160, minor_sections=80).export('\$d/t.stl')\"
  time $SLICER_BIN --datadir \$d/data --export-gcode --center 110,110 --output \$d/t.gcode \$d/t.stl >/dev/null
  grep -E 'generated by|estimated printing time \(normal' \$d/t.gcode"

# ---------------------------------------------------------------------------
say "Services"
install -d -m 755 $LIB_DIR
for f in common.sh update.sh publish-api-address.sh wifi-watchdog.sh; do
  install -o root -g root -m 755 "$HERE/$f" "$LIB_DIR/$f"
done
install -o root -g root -m 644 "$HERE"/systemd/printos-* /etc/systemd/system/
install -d -m 755 /etc/systemd/system/klipper.service.d
printf '# Added by 3D Print OS tools/linux/install.sh: Klipper wins every CPU contest.\n[Service]\nCPUWeight=1000\n' \
  >/etc/systemd/system/klipper.service.d/90-printos-priority.conf
chmod 644 /etc/systemd/system/klipper.service.d/90-printos-priority.conf
systemctl daemon-reload
# The drop-in covers every later start. Apply the weight to the running Klipper too, without restarting it.
systemctl set-property --runtime klipper.service CPUWeight=1000
systemctl enable --quiet printos-geometry.service printos-api.service
systemctl enable --quiet --now printos-wifi-watchdog.timer
restart_and_check

# ---------------------------------------------------------------------------
name=$(tailscale status --json | python3 -I -c 'import json,sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')
PUBLIC=https://$name:$FUNNEL_PORT/api/v1
if [ "$FUNNEL" = 1 ]; then
  say "Tailscale Funnel on port $FUNNEL_PORT"
  before=$(tailscale serve status --json)
  if [ "$funnel" = none ]; then
    timeout 60 tailscale funnel --bg --https=$FUNNEL_PORT http://127.0.0.1:3000 </dev/null
  fi
  BEFORE=$before AFTER=$(tailscale serve status --json) python3 -I -c '
import json, os, sys
def missing(old, new):
    if isinstance(old, dict):
        return not isinstance(new, dict) or any(k not in new or missing(v, new[k]) for k, v in old.items())
    return old != new
sys.exit(missing(json.loads(os.environ["BEFORE"] or "{}"), json.loads(os.environ["AFTER"] or "{}")))
' || die "An existing Tailscale entry changed! Compare with: tailscale serve status"
  [ "$(funnel_state)" = ours ] || die "Funnel is not on. If a link was printed above, open it to allow Funnel, then run this again."
  tailscale serve status
  echo "Existing Serve entries are unchanged."
fi
if [ "$PUBLISH" = 1 ]; then
  "$LIB_DIR/publish-api-address.sh" "$PUBLIC"
fi

say "Done"
echo "Public API: $PUBLIC"
echo "Update with: sudo $LIB_DIR/update.sh"
