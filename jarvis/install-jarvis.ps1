# Installs OpenJarvis and sets it up as "Jarvis" for Careva+ on Windows.
# Usage (in PowerShell, inside this folder):
#   powershell -ExecutionPolicy Bypass -File .\install-jarvis.ps1
$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$jarvisHome = if ($env:OPENJARVIS_HOME) { $env:OPENJARVIS_HOME } else { Join-Path $env:USERPROFILE '.openjarvis' }

Write-Host "==> Step 1/3: Installing OpenJarvis (official installer, a few minutes)" -ForegroundColor Cyan
if (Get-Command jarvis -ErrorAction SilentlyContinue) {
    Write-Host "    OpenJarvis is already installed - skipping."
} else {
    # Official installer: installs Python (if needed), git, uv, Ollama and the qwen3.5:2b model.
    $env:OPENJARVIS_SKIP_SERVICE = '1'
    irm https://open-jarvis.github.io/OpenJarvis/install.ps1 | iex
}

Write-Host "==> Step 2/3: Applying the Careva+ Jarvis personality and settings" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $jarvisHome | Out-Null
$cfg = Join-Path $jarvisHome 'config.toml'
if (Test-Path $cfg) {
    Copy-Item $cfg "$cfg.backup" -Force
    Write-Host "    Old settings saved to $cfg.backup"
}
Copy-Item (Join-Path $here 'home\config.toml') $cfg -Force
Copy-Item (Join-Path $here 'home\SOUL.md') (Join-Path $jarvisHome 'SOUL.md') -Force
$userMd = Join-Path $jarvisHome 'USER.md'
if (Test-Path $userMd) { Write-Host "    Keeping your existing USER.md" }
else { Copy-Item (Join-Path $here 'home\USER.md') $userMd }

Write-Host "==> Step 3/3: Done!" -ForegroundColor Green
Write-Host @"

  Jarvis is ready.

  1. Open a NEW PowerShell window (so the 'jarvis' command is found).
  2. Tell Jarvis about you:   notepad "$userMd"
  3. Talk to Jarvis:
        jarvis chat          (chat in the terminal)
        jarvis gui           (chat in your web browser - needs Node.js 22+)
        jarvis ask "Draft a WhatsApp reply to a new enquiry for a 12-hour caretaker"
  4. Something wrong?        jarvis doctor

"@
