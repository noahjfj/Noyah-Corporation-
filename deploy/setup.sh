#!/usr/bin/env bash
# Installation sur un VPS Ubuntu 24.04 (à lancer en root).
# Usage : bash deploy/setup.sh <domaine>
#   Sans nom de domaine, utilise <ip-avec-tirets>.sslip.io (ex. 1-2-3-4.sslip.io) : HTTPS gratuit et automatique.
set -euo pipefail
DOMAIN="${1:?Donne le domaine, ex. 1-2-3-4.sslip.io}"
APP_DIR=/opt/noyah-corporation

apt-get update
apt-get install -y curl git debian-keyring debian-archive-keyring apt-transport-https ufw

# Node.js 22
if ! command -v node >/dev/null || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

# Caddy (reverse proxy + certificat HTTPS automatique)
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update && apt-get install -y caddy
fi

# Utilisateur dédié, sans droits root
id noyah >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin noyah
mkdir -p "$APP_DIR" && cp -r . "$APP_DIR" && chown -R noyah:noyah "$APP_DIR"
cd "$APP_DIR" && sudo -u noyah npm ci --omit=dev

[[ -f "$APP_DIR/.env" ]] || { cp .env.example .env; chown noyah:noyah .env; chmod 600 .env; echo "→ Remplis $APP_DIR/.env"; }

sed "s/{{DOMAIN}}/$DOMAIN/" deploy/Caddyfile > /etc/caddy/Caddyfile
cp deploy/noyah.service /etc/systemd/system/noyah.service
systemctl daemon-reload
systemctl enable --now noyah caddy
systemctl reload caddy

ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable

echo "✅ Installé. Webhook WhatsApp : https://$DOMAIN/webhook"
