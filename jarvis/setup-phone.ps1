# Connects Jarvis to Telegram so you can chat with it from your phone (Windows).
# Usage:  powershell -ExecutionPolicy Bypass -File .\setup-phone.ps1
$ErrorActionPreference = 'Stop'

if (-not (Get-Command jarvis -ErrorAction SilentlyContinue)) {
    Write-Host "Jarvis is not installed yet. Run install-jarvis.ps1 first, then open a new PowerShell window."
    exit 1
}

Write-Host @"

Connect Jarvis to Telegram (about 3 minutes)
---------------------------------------------
On your phone, in the Telegram app:
  1. Search for  @BotFather  and send:  /newbot
     Choose a name (e.g. Careva Jarvis) and a username ending in "bot".
     BotFather replies with a TOKEN like  123456789:AAH...  - copy it.
  2. Search for  @userinfobot  and send any message.
     It replies with your ID (a number like 987654321) - copy it.

"@

$secure = Read-Host "Paste the bot TOKEN (it stays hidden)" -AsSecureString
$token = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)).Trim()
$chatId = (Read-Host "Paste your Telegram ID number").Trim()

if ($token -notmatch '^[0-9]+:[A-Za-z0-9_-]+$') { Write-Host "That does not look like a bot token (it should look like 123456789:AAH...). Please run again."; exit 1 }
if ($chatId -notmatch '^-?[0-9]+$') { Write-Host "Your Telegram ID should be only digits. Please run again."; exit 1 }

jarvis config set channel.enabled true | Out-Null
jarvis config set channel.default_channel telegram | Out-Null
jarvis config set channel.default_agent orchestrator | Out-Null
jarvis config set channel.telegram.bot_token $token | Out-Null
# Only YOUR Telegram account may talk to Jarvis - everyone else is ignored.
jarvis config set channel.telegram.allowed_chat_ids $chatId | Out-Null

Write-Host @"

Done! To use Jarvis from your phone:
  1. On this computer run:   jarvis serve
     (keep this window open and the computer awake)
  2. On your phone, open your new bot in Telegram and say "Hi Jarvis".

To stop phone access:  jarvis config set channel.enabled false
"@
