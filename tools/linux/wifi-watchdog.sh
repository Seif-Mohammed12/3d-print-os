#!/usr/bin/env bash
# After a failed Wi-Fi handshake (weak signal) NetworkManager assumes the saved password is wrong
# and waits for someone to type it on the laptop's screen. On 2026-11-19 that kept the laptop
# offline for 21 hours. This reconnects with the saved password instead.
set -uo pipefail

dev=$(nmcli -t -f DEVICE,TYPE device | awk -F: '$2 == "wifi" { print $1; exit }')
[ -n "$dev" ] || exit 0
state=$(nmcli -g GENERAL.STATE device show "$dev" | cut -d' ' -f1)
# 30 disconnected, 60 waiting for a password, 120 failed. Anything else is connected, busy
# connecting, or switched off on purpose.
case "$state" in 30 | 60 | 120) ;; *) exit 0 ;; esac

# The Wi-Fi profile that worked most recently.
uuid=$(nmcli -t -f UUID,TYPE,TIMESTAMP connection show |
  awk -F: '$2 == "802-11-wireless" { print $3, $1 }' | sort -rn | awk 'NR == 1 { print $2 }')
[ -n "$uuid" ] || exit 0
echo "Wi-Fi is in state $state; reconnecting"
if nmcli --wait 60 connection up uuid "$uuid" ifname "$dev" >/dev/null 2>&1; then
  echo "Wi-Fi reconnected"
else
  echo "Still offline; trying again in two minutes"
fi
