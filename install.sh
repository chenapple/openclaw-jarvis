#!/usr/bin/env bash
# JARVIS — OpenClaw Monitor Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/chenapple/openclaw-jarvis/main/install.sh | bash
set -e

JARVIS_DIR="$HOME/.openclaw/jarvis"
REPO_URL="https://raw.githubusercontent.com/chenapple/openclaw-jarvis/main"

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   JARVIS — OpenClaw Monitor          ║"
echo "  ║   Installer                          ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# ── Step 1: Check Node.js ──
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node -v)
  echo "  ✓ Node.js found: $NODE_VER"
else
  echo "  ✗ Node.js not found."
  echo ""
  echo "  Install Node.js first:"
  echo "    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash"
  echo "    nvm install --lts"
  echo ""
  echo "  Then re-run this installer."
  exit 1
fi

# ── Step 2: Check/Install openclaw ──
OPENCLAW_BIN=""
if command -v openclaw >/dev/null 2>&1; then
  OPENCLAW_BIN="openclaw"
elif [ -d "$HOME/.nvm/versions/node" ]; then
  NVM_DIR=$(ls -1 "$HOME/.nvm/versions/node" | head -1)
  if [ -f "$HOME/.nvm/versions/node/$NVM_DIR/bin/openclaw" ]; then
    OPENCLAW_BIN="$HOME/.nvm/versions/node/$NVM_DIR/bin/openclaw"
  fi
fi

if [ -n "$OPENCLAW_BIN" ]; then
  OC_VER=$($OPENCLAW_BIN --version 2>/dev/null | head -1 || echo "unknown")
  echo "  ✓ OpenClaw found: $OC_VER"
else
  echo "  → Installing OpenClaw..."
  npm install -g openclaw
  echo "  ✓ OpenClaw installed."
fi

# ── Step 3: Create JARVIS directory ──
mkdir -p "$JARVIS_DIR"
echo "  → Downloading JARVIS files..."

curl -fsSL "$REPO_URL/index.html" -o "$JARVIS_DIR/index.html"
curl -fsSL "$REPO_URL/server.js" -o "$JARVIS_DIR/server.js"

# Download 3D model (8.7MB) — show progress
if [ ! -f "$JARVIS_DIR/v1_0_IronManRigged.glb" ]; then
  echo "  → Downloading 3D model (8.7MB)..."
  curl -fSL "$REPO_URL/v1_0_IronManRigged.glb" -o "$JARVIS_DIR/v1_0_IronManRigged.glb"
else
  echo "  ✓ 3D model already exists, skipping."
fi

echo "  ✓ Files installed to $JARVIS_DIR"

# ── Step 4: Add shell alias ──
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
    echo "  ✓ Alias 'jarvis' already exists in $SHELL_RC"
  fi
fi

# ── Step 5: Run doctor if first time ──
if [ ! -f "$HOME/.openclaw/openclaw.json" ]; then
  echo ""
  echo "  → First time setup: running openclaw doctor..."
  echo ""
  if [ -n "$OPENCLAW_BIN" ]; then
    $OPENCLAW_BIN doctor --non-interactive || true
  else
    openclaw doctor --non-interactive || true
  fi
fi

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   Installation complete!             ║"
echo "  ╠══════════════════════════════════════╣"
echo "  ║                                      ║"
echo "  ║   Start JARVIS:                      ║"
echo "  ║     node ~/.openclaw/jarvis/server.js║"
echo "  ║     open http://localhost:3000        ║"
echo "  ║                                      ║"
echo "  ║   Or open a new terminal and type:   ║"
echo "  ║     jarvis                            ║"
echo "  ║                                      ║"
echo "  ╚══════════════════════════════════════╝"
echo ""
