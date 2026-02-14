#!/usr/bin/env bash
# JARVIS — OpenClaw Monitor Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/chenapple/openclaw-jarvis/main/install.sh | bash
set -e

JARVIS_DIR="$HOME/.openclaw/jarvis"

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   JARVIS — OpenClaw Monitor          ║"
echo "  ║   Installer                          ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# ── Step 1: Node.js ──
if command -v node >/dev/null 2>&1; then
  echo "  ✓ Node.js found: $(node -v)"
else
  echo "  → Node.js not found, installing via nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  nvm install --lts
  echo "  ✓ Node.js installed: $(node -v)"
fi

# Ensure nvm is loaded for subsequent commands
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# ── Step 2: OpenClaw ──
OPENCLAW_BIN=""
if command -v openclaw >/dev/null 2>&1; then
  OPENCLAW_BIN="openclaw"
elif [ -d "$HOME/.nvm/versions/node" ]; then
  NVM_NODE_DIR=$(ls -1 "$HOME/.nvm/versions/node" | sort -V | tail -1)
  if [ -f "$HOME/.nvm/versions/node/$NVM_NODE_DIR/bin/openclaw" ]; then
    OPENCLAW_BIN="$HOME/.nvm/versions/node/$NVM_NODE_DIR/bin/openclaw"
  fi
fi

NEED_DOCTOR=false
if [ -n "$OPENCLAW_BIN" ]; then
  OC_VER=$($OPENCLAW_BIN --version 2>/dev/null | head -1 || echo "unknown")
  echo "  ✓ OpenClaw found: $OC_VER"
else
  echo "  → Installing OpenClaw..."
  npm install -g openclaw
  OPENCLAW_BIN="openclaw"
  NEED_DOCTOR=true
  echo "  ✓ OpenClaw installed"
fi

# First time: also need doctor if no config exists
if [ ! -f "$HOME/.openclaw/openclaw.json" ]; then
  NEED_DOCTOR=true
fi

# ── Step 3: JARVIS ──
if [ -d "$JARVIS_DIR/.git" ]; then
  echo "  → Updating JARVIS..."
  git -C "$JARVIS_DIR" pull origin main
  echo "  ✓ JARVIS updated"
else
  mkdir -p "$(dirname "$JARVIS_DIR")"
  if [ -d "$JARVIS_DIR" ]; then
    mv "$JARVIS_DIR" "$JARVIS_DIR.bak.$(date +%s)"
    echo "  → Existing directory backed up"
  fi
  echo "  → Cloning JARVIS..."
  git clone https://github.com/chenapple/openclaw-jarvis.git "$JARVIS_DIR"
  echo "  ✓ JARVIS cloned"
fi

# ── Step 4: Shell alias ──
SHELL_RC=""
if [ -f "$HOME/.zshrc" ]; then
  SHELL_RC="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
  SHELL_RC="$HOME/.bashrc"
fi

if [ -n "$SHELL_RC" ]; then
  if ! grep -q 'alias jarvis=' "$SHELL_RC" 2>/dev/null; then
    echo '' >> "$SHELL_RC"
    echo '# JARVIS — OpenClaw Monitor' >> "$SHELL_RC"
    echo 'alias jarvis="node ~/.openclaw/jarvis/server.js & sleep 1 && open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null || echo http://localhost:3000"' >> "$SHELL_RC"
    echo "  ✓ Alias 'jarvis' added to $SHELL_RC"
  else
    echo "  ✓ Alias 'jarvis' already exists"
  fi
fi

# ── Step 5: First-time OpenClaw setup ──
if [ "$NEED_DOCTOR" = true ]; then
  echo ""
  echo "  ┌──────────────────────────────────────┐"
  echo "  │  First-time OpenClaw setup            │"
  echo "  │  Please follow the prompts below      │"
  echo "  │  to configure API keys and models.    │"
  echo "  └──────────────────────────────────────┘"
  echo ""
  $OPENCLAW_BIN doctor || true
fi

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   Installation complete!             ║"
echo "  ╠══════════════════════════════════════╣"
echo "  ║                                      ║"
echo "  ║   Start JARVIS:                      ║"
echo "  ║     node ~/.openclaw/jarvis/server.js ║"
echo "  ║     open http://localhost:3000        ║"
echo "  ║                                      ║"
echo "  ║   Or open a new terminal and type:   ║"
echo "  ║     jarvis                            ║"
echo "  ║                                      ║"
echo "  ╚══════════════════════════════════════╝"
echo ""
