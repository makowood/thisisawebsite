#!/usr/bin/env bash
# Runs on sentinel. Installs guestbook code from ~/guestbook-staging into
# /opt/guestbook, then restarts the service and checks it came back up.
# Never touches data/ or node_modules/. Invoked by the deploy-guestbook
# fish function on the laptop; pass -n to only show what would change.
set -euo pipefail

STAGE="$HOME/guestbook-staging"
APP=/opt/guestbook
FILES="server.js wordlist.json package.json README.md guestbook.service"
DRY=0
[ "${1:-}" = "-n" ] && DRY=1

cd "$STAGE"
changed=""
for f in $FILES; do
  if ! cmp -s "$f" "$APP/$f"; then
    changed="$changed $f"
    if [ $DRY -eq 1 ]; then
      echo "would update $f"
    else
      sudo install -m 644 -o root -g root "$f" "$APP/$f"
      echo "updated $f"
    fi
  fi
done

if [ -z "$changed" ]; then echo "nothing changed."; exit 0; fi
[ $DRY -eq 1 ] && exit 0

case "$changed" in *package.json*)
  echo "package.json changed, reinstalling deps"
  (cd "$APP" && sudo npm install --omit=dev --ignore-scripts)
esac

case "$changed" in *guestbook.service*)
  sudo install -m 644 -o root -g root "$APP/guestbook.service" /etc/systemd/system/guestbook.service
  sudo systemctl daemon-reload
esac

sudo systemctl restart guestbook
sleep 2
if systemctl is-active --quiet guestbook && curl -sf -o /dev/null http://127.0.0.1:8787/api/guestbook; then
  echo "guestbook is up."
else
  echo "guestbook FAILED to come back up:"
  sudo journalctl -u guestbook -n 25 --no-pager
  exit 1
fi
