#!/usr/bin/env bash
# Connects Jarvis to Telegram so you can chat with it from your phone.
# Usage:  bash setup-phone.sh
set -euo pipefail

if ! command -v jarvis >/dev/null 2>&1; then
    echo "Jarvis is not installed yet. Run:  bash install-jarvis.sh  first, then open a new terminal."
    exit 1
fi

cat <<'MSG'

Connect Jarvis to Telegram (about 3 minutes)
---------------------------------------------
On your phone, in the Telegram app:
  1. Search for  @BotFather  and send:  /newbot
     Choose a name (e.g. Careva Jarvis) and a username ending in "bot".
     BotFather replies with a TOKEN like  123456789:AAH...  - copy it.
  2. Search for  @userinfobot  and send any message.
     It replies with your ID (a number like 987654321) - copy it.

MSG

read -r -s -p "Paste the bot TOKEN (it stays hidden): " TOKEN; echo
read -r -p "Paste your Telegram ID number: " CHAT_ID
TOKEN="$(echo "$TOKEN" | tr -d '[:space:]')"
CHAT_ID="$(echo "$CHAT_ID" | tr -d '[:space:]')"

if [[ ! "$TOKEN" =~ ^[0-9]+:[A-Za-z0-9_-]+$ ]]; then
    echo "That does not look like a bot token (it should look like 123456789:AAH...). Please run again."; exit 1
fi
if [[ ! "$CHAT_ID" =~ ^-?[0-9]+$ ]]; then
    echo "Your Telegram ID should be only digits. Please run again."; exit 1
fi

jarvis config set channel.enabled true                         >/dev/null
jarvis config set channel.default_channel telegram             >/dev/null
jarvis config set channel.default_agent orchestrator           >/dev/null
jarvis config set channel.telegram.bot_token "$TOKEN"          >/dev/null
# Only YOUR Telegram account may talk to Jarvis - everyone else is ignored.
jarvis config set channel.telegram.allowed_chat_ids "$CHAT_ID" >/dev/null

cat <<'MSG'

Done! To use Jarvis from your phone:
  1. On this computer run:   jarvis serve
     (keep this window open and the computer awake)
  2. On your phone, open your new bot in Telegram and say "Hi Jarvis".

To stop phone access:  jarvis config set channel.enabled false
MSG
