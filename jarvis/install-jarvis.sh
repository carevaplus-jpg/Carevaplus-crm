#!/usr/bin/env bash
# Installs OpenJarvis and sets it up as "Jarvis" for Careva+.
# Works on macOS, Linux and Windows WSL2.   Usage:  bash install-jarvis.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
JARVIS_HOME="${OPENJARVIS_HOME:-$HOME/.openjarvis}"

echo "==> Step 1/3: Installing OpenJarvis (official installer, about 3 minutes)"
if command -v jarvis >/dev/null 2>&1 || [ -x "$HOME/.local/bin/jarvis" ]; then
    echo "    OpenJarvis is already installed - skipping."
else
    # Official installer: installs uv, Python env, Ollama and the qwen3.5:2b model.
    # --no-analytics: send no usage data to anyone.
    curl -fsSL https://open-jarvis.github.io/OpenJarvis/install.sh | bash -s -- --no-analytics
fi

echo "==> Step 2/3: Applying the Careva+ Jarvis personality and settings"
mkdir -p "$JARVIS_HOME"
if [ -f "$JARVIS_HOME/config.toml" ]; then
    cp "$JARVIS_HOME/config.toml" "$JARVIS_HOME/config.toml.backup"
    echo "    Old settings saved to $JARVIS_HOME/config.toml.backup"
fi
cp "$HERE/home/config.toml" "$JARVIS_HOME/config.toml"
cp "$HERE/home/SOUL.md"     "$JARVIS_HOME/SOUL.md"
if [ -f "$JARVIS_HOME/USER.md" ]; then
    echo "    Keeping your existing USER.md"
else
    cp "$HERE/home/USER.md" "$JARVIS_HOME/USER.md"
fi

echo "==> Step 3/3: Done!"
cat <<MSG

  Jarvis is ready.

  1. Open a NEW terminal window (so the 'jarvis' command is found).
  2. Tell Jarvis about you:   open $JARVIS_HOME/USER.md and fill it in.
  3. Talk to Jarvis:
        jarvis chat          (chat in the terminal)
        jarvis gui           (chat in your web browser - needs Node.js 22+)
        jarvis ask "Draft a WhatsApp reply to a new enquiry for a 12-hour caretaker"
  4. Something wrong?        jarvis doctor

MSG
