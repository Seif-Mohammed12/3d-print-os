#!/usr/bin/env bash
# Update the backend on the printer laptop: pull, install, build, restart, health-check.
#   sudo /usr/local/lib/printos/update.sh [--branch NAME] [--force]
# --branch switches to another branch; --force runs even during a print.
# Changes to units or to these scripts need install.sh again (root runs only its own copies).
set -euo pipefail
. "$(dirname "$(readlink -f "$0")")/common.sh"
require_root
confine_self "$@"

BRANCH=
while [ $# -gt 0 ]; do
  case "$1" in
    --branch) BRANCH=${2:?}; shift 2 ;;
    --force) FORCE=1; shift ;;
    *) die "Unknown option $1" ;;
  esac
done
case "$BRANCH" in -* | *[!A-Za-z0-9._/-]*) die "Not a branch name: $BRANCH" ;; esac

refuse_while_printing
say "Updating the code"
as_printos "git fetch --prune origin
  [ -z '$BRANCH' ] || git checkout -q '$BRANCH'
  git pull --ff-only
  git log --oneline -1"
build_app
restart_and_check
