# JARVIS — OpenClaw Monitor

A browser-based control center for [OpenClaw](https://docs.openclaw.ai), featuring a 3D Iron Man HUD interface.

<p align="center">
  <strong>Manage your AI gateway, models, channels, and chat — all from one page.</strong>
</p>

## Quick Install

```bash
curl -fsSL https://raw.githubusercontent.com/chenapple/openclaw-jarvis/main/install.sh | bash
```

This will:
1. Check for Node.js (required)
2. Install OpenClaw if not present
3. Download JARVIS files to `~/.openclaw/jarvis/`
4. Add a `jarvis` command alias
5. Run initial setup if needed

## Usage

```bash
jarvis
```

Or manually:

```bash
node ~/.openclaw/jarvis/server.js
# then open http://localhost:3000
```

## Features

### Dashboard
- Real-time gateway connection status
- Session count, client count, token usage, cost tracking
- 3D Iron Man model with reactive animations

### Model Management
- Browse and set AI models from any provider
- Auth profile management (paste tokens, refresh OAuth)
- Fallback model configuration

### Channel Management
- Add/remove/configure messaging channels
- WhatsApp QR code login directly in browser
- Per-channel logs viewer
- Logout / reconnect controls
- Supported: WhatsApp, Telegram, Discord, Slack, Signal, iMessage, and 10+ more

### Chat
- Live chat with your AI agent
- Thinking level control (auto / none / low / medium / high)
- Verbose output toggle (off / on / full)
- Voice input support
- Markdown rendering with code blocks

### Sessions
- Browse all conversation sessions
- View token usage per session
- Model and context window info

### System
- Gateway and channel log viewer
- System diagnostics (`openclaw doctor`)
- Fallback model management

## Requirements

- **Node.js** 18+ (recommended: install via [nvm](https://github.com/nvm-sh/nvm))
- **OpenClaw** (installed automatically by the install script)

## Files

| File | Description |
|------|-------------|
| `server.js` | Node.js backend — API endpoints, WebSocket proxy, SSE |
| `index.html` | Single-file frontend — HTML + CSS + JS + Three.js |
| `v1_0_IronManRigged.glb` | 3D Iron Man model (8.7MB, rigged, from Cinema 4D) |
| `install.sh` | One-line installer script |

## License

MIT
