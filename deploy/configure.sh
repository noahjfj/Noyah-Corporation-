#!/usr/bin/env bash
# Remplit /opt/noyah-corporation/.env en posant les questions une par une.
# Les secrets sont saisis sans s'afficher à l'écran. Usage : bash deploy/configure.sh
set -euo pipefail
ENV_FILE=/opt/noyah-corporation/.env

ask() { local v; read -rp "$1 : " v; echo "$v"; }
ask_secret() { local v; read -rsp "$1 (invisible, colle puis Entrée) : " v; echo >&2; echo "$v"; }

echo "=== Configuration de Noyah Corporation ==="
ANTHROPIC_API_KEY=$(ask_secret "Clé API Anthropic (sk-ant-...)")
WHATSAPP_PHONE_NUMBER_ID=$(ask "WhatsApp - ID du numéro de téléphone")
WHATSAPP_ACCESS_TOKEN=$(ask_secret "WhatsApp - jeton d'accès (EAA...)")
WHATSAPP_APP_SECRET=$(ask_secret "Meta - clé secrète de l'app (Paramètres de l'app > Général)")
OWNER_WHATSAPP_NUMBER=$(ask "Ton numéro WhatsApp, format international sans + (ex. 32470123456)")
MS_CLIENT_ID=$(ask "Microsoft - Application (client) ID")
WHATSAPP_VERIFY_TOKEN=$(openssl rand -hex 16)

umask 077
cat > "$ENV_FILE" <<CONF
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
CLAUDE_MODEL=claude-opus-5-5
WHATSAPP_PHONE_NUMBER_ID=$WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_ACCESS_TOKEN=$WHATSAPP_ACCESS_TOKEN
WHATSAPP_APP_SECRET=$WHATSAPP_APP_SECRET
WHATSAPP_VERIFY_TOKEN=$WHATSAPP_VERIFY_TOKEN
OWNER_WHATSAPP_NUMBER=$OWNER_WHATSAPP_NUMBER
MS_CLIENT_ID=$MS_CLIENT_ID
MS_TENANT=consumers
TIMEZONE=Europe/Brussels
PORT=3000
CONF
chown noyah:noyah "$ENV_FILE"
systemctl restart noyah

echo
echo "✅ Configuration enregistrée et agent redémarré."
echo "👉 Jeton de vérification à coller chez Meta (Webhook > Vérifier le jeton) : $WHATSAPP_VERIFY_TOKEN"
