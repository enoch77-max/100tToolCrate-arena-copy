#!/usr/bin/env bash
set -Eeuo pipefail

# Run from a separate release checkout: sudo bash deploy/install.sh
APP_DIR="${APP_DIR:-/var/www/100toolcrate}"
APP_USER="${APP_USER:-toolcrate}"
DOMAIN="${DOMAIN:-100toolcrate.com}"
ENV_FILE="${ENV_FILE:-/etc/100toolcrate/env}"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="$(command -v node || true)"

if [[ $EUID -ne 0 ]]; then echo "Run as root (sudo)." >&2; exit 1; fi
if [[ "$SRC_DIR" == "$APP_DIR" ]]; then echo "Use a separate release checkout, not APP_DIR itself." >&2; exit 1; fi
for command in node npm rsync nginx systemctl curl; do command -v "$command" >/dev/null || { echo "Missing required command: $command" >&2; exit 1; }; done
NODE_MAJOR="$($NODE_BIN -p 'process.versions.node.split(".")[0]')"
if (( NODE_MAJOR < 20 )); then echo "Node.js 20 or newer is required; found $($NODE_BIN -v)." >&2; exit 1; fi

if ! getent group "$APP_USER" >/dev/null 2>&1; then
  groupadd --system "$APP_USER"
fi
if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --gid "$APP_USER" --home-dir "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
fi
mkdir -p "$APP_DIR" "$(dirname "$ENV_FILE")" /var/www/certbot /etc/nginx/sites-available /etc/nginx/sites-enabled

rsync -a --delete \
  --exclude='/.git/' --exclude='/node_modules/' --exclude='/dist/' \
  --exclude='/data/' --exclude='/backups/' --exclude='/.env' \
  "$SRC_DIR/" "$APP_DIR/"

cd "$APP_DIR"
npm ci --omit=dev
npm run build

mkdir -p "$APP_DIR/data" "$APP_DIR/backups"
if [[ ! -f "$ENV_FILE" ]]; then
  cp .env.example "$ENV_FILE"
  sed -i "s|/var/www/100toolcrate|$APP_DIR|g" "$ENV_FILE"
  sed -i "s|PUBLIC_ORIGIN=https://100toolcrate.com|PUBLIC_ORIGIN=https://$DOMAIN|" "$ENV_FILE"
fi
chmod 600 "$ENV_FILE"
chown root:root "$ENV_FILE"

render() {
  local source="$1" destination="$2"
  sed -e "s|__APP_DIR__|$APP_DIR|g" -e "s|__APP_USER__|$APP_USER|g" \
      -e "s|__NODE_BIN__|$NODE_BIN|g" -e "s|__ENV_FILE__|$ENV_FILE|g" \
      -e "s|__DOMAIN__|$DOMAIN|g" "$source" > "$destination"
}
render deploy/100toolcrate.service /etc/systemd/system/100toolcrate.service
render deploy/100toolcrate-backup.service /etc/systemd/system/100toolcrate-backup.service
cp deploy/100toolcrate-backup.timer /etc/systemd/system/100toolcrate-backup.timer
render deploy/nginx.conf /etc/nginx/sites-available/100toolcrate
ln -sfn /etc/nginx/sites-available/100toolcrate /etc/nginx/sites-enabled/100toolcrate

chown -R root:"$APP_USER" "$APP_DIR"
chmod -R u=rwX,g=rX,o= "$APP_DIR"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR/data" "$APP_DIR/backups"
chmod 750 "$APP_DIR/data" "$APP_DIR/backups"

nginx -t
systemctl daemon-reload
systemctl enable 100toolcrate.service 100toolcrate-backup.timer
systemctl restart 100toolcrate.service
systemctl restart 100toolcrate-backup.timer
systemctl reload nginx

for attempt in {1..20}; do
  if curl -fsS http://127.0.0.1:3000/readyz >/dev/null; then break; fi
  if [[ $attempt -eq 20 ]]; then journalctl -u 100toolcrate.service -n 60 --no-pager; exit 1; fi
  sleep 1
done
systemctl start 100toolcrate-backup.service

echo "Deployment ready on HTTP. Issue and renew HTTPS with:"
echo "  certbot --nginx -d $DOMAIN -d www.$DOMAIN --redirect"
echo "Check: systemctl status 100toolcrate; journalctl -u 100toolcrate -n 100"
