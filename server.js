#!/usr/bin/env node
// JARVIS — OpenClaw Monitor Backend
// 用法: node ~/.openclaw/jarvis/server.js
// 访问: http://localhost:3000

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile, spawn } = require('child_process');
const net = require('net');

// Resolve ws from openclaw's node_modules (may fail if openclaw not installed)
const nvmNode = path.join(os.homedir(), '.nvm/versions/node');
let WS;
try {
  WS = require(require.resolve('ws', { paths: [
    ...(fs.existsSync(nvmNode) ? [path.join(nvmNode, fs.readdirSync(nvmNode)[0], 'lib/node_modules/openclaw/node_modules')] : []),
    path.join(__dirname, 'node_modules'),
    ...require('module')._nodeModulePaths(__dirname),
  ]}));
} catch {
  console.log('[jarvis] ⚠ ws module not found — WebSocket proxy disabled (install openclaw first)');
}

const PORT = parseInt(process.argv[2]) || 3000;
const GW_WS = 'ws://127.0.0.1:18789';
const GW_TOKEN = 'e4b674e9b414e20712d9c5361012d384611a383d55b068fc';
const HTML_PATH = path.join(__dirname, 'index.html');
const CONFIG_PATH = path.join(os.homedir(), '.openclaw/openclaw.json');
const AUTH_PROFILES_PATH = path.join(os.homedir(), '.openclaw/agents/main/agent/auth-profiles.json');
const GW_PORT = 18789;

// Resolve openclaw binary path
const nvmBin = path.join(os.homedir(), '.nvm/versions/node');
const OPENCLAW_BIN = fs.existsSync(nvmBin)
  ? path.join(nvmBin, fs.readdirSync(nvmBin)[0], 'bin/openclaw')
  : 'openclaw';

// ── Startup Check: is openclaw installed? ──
let openclawReady = false;
try {
  require('child_process').execFileSync(OPENCLAW_BIN, ['--version'], { stdio: 'pipe', timeout: 5000 });
  openclawReady = true;
} catch {
  console.log('[jarvis] ⚠ openclaw not found — setup guide will be shown');
}

function serveSetupPage(res) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>JARVIS — Setup Required</title>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#080604;color:#e8dcc8;font-family:'JetBrains Mono',monospace;min-height:100vh;display:flex;align-items:center;justify-content:center}
.card{max-width:600px;width:90%;padding:40px;border:1px solid rgba(212,164,78,0.2);background:rgba(12,10,6,0.95);position:relative}
.card::before{content:'';position:absolute;top:-1px;left:-1px;width:24px;height:24px;border-top:2px solid #d4a44e;border-left:2px solid #d4a44e}
.card::after{content:'';position:absolute;bottom:-1px;right:-1px;width:24px;height:24px;border-bottom:2px solid #d4a44e;border-right:2px solid #d4a44e}
h1{font-family:'Orbitron',sans-serif;color:#d4a44e;font-size:20px;letter-spacing:4px;margin-bottom:8px;text-shadow:0 0 10px rgba(212,164,78,0.5)}
.sub{color:#a89070;font-size:12px;margin-bottom:28px}
.step{margin-bottom:20px}
.step-num{display:inline-block;width:24px;height:24px;background:rgba(212,164,78,0.1);border:1px solid rgba(212,164,78,0.3);color:#d4a44e;text-align:center;line-height:24px;font-size:11px;font-weight:700;margin-right:10px;font-family:'Orbitron',sans-serif}
.step-title{color:#e8dcc8;font-size:13px;font-weight:600}
.step-desc{color:#a89070;font-size:11px;margin:6px 0 6px 34px}
code{display:block;margin:6px 0 0 34px;padding:10px 14px;background:rgba(212,164,78,0.06);border:1px solid rgba(212,164,78,0.1);color:#d4a44e;font-size:12px;cursor:pointer;user-select:all;word-break:break-all}
code:hover{border-color:rgba(212,164,78,0.3)}
.done{margin-top:28px;text-align:center}
.done a{display:inline-block;padding:10px 28px;background:rgba(0,255,136,0.08);border:1px solid rgba(0,255,136,0.3);color:#00ff88;font-family:'Orbitron',sans-serif;font-size:11px;letter-spacing:2px;text-decoration:none;cursor:pointer;transition:all 0.2s}
.done a:hover{background:rgba(0,255,136,0.15);box-shadow:0 0 20px rgba(0,255,136,0.2)}
.note{margin-top:16px;font-size:10px;color:#6a5540;text-align:center}
</style></head><body><div class="card">
<h1>JARVIS</h1>
<div class="sub">OpenClaw is not installed. Follow these steps to get started:</div>
<div class="step"><span class="step-num">1</span><span class="step-title">Install Node.js</span>
<div class="step-desc">Skip if you already have Node.js 18+</div>
<code>curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash && nvm install --lts</code></div>
<div class="step"><span class="step-num">2</span><span class="step-title">Install OpenClaw</span>
<code>npm install -g openclaw</code></div>
<div class="step"><span class="step-num">3</span><span class="step-title">Initial Setup</span>
<div class="step-desc">Runs health checks and configures your environment</div>
<code>openclaw doctor</code></div>
<div class="step"><span class="step-num">4</span><span class="step-title">Restart JARVIS</span>
<div class="step-desc">After installing, restart the server and refresh this page</div>
<code>Ctrl+C then: node ~/.openclaw/jarvis/server.js</code></div>
<div class="done"><a href="/" onclick="location.reload();return false">RETRY CONNECTION</a></div>
<div class="note">JARVIS needs OpenClaw to manage models, channels, and the gateway.</div>
</div></body></html>`);
}

// ── Active QR Login Processes ──
let activeQrLogins = {};

// ── Models Catalog Cache ──
let catalogCache = null;
let catalogCacheTime = 0;
const CATALOG_CACHE_TTL = 60000; // 60s

function runCli(args, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const child = spawn(OPENCLAW_BIN, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0', CI: '1' },
      timeout: timeoutMs,
    });
    let out = '';
    child.stdout.on('data', d => { out += d.toString(); });
    child.stderr.on('data', d => { out += d.toString(); });
    child.on('close', (code) => {
      if (code === 0) resolve(out);
      else reject(new Error('exit code ' + code + ': ' + out.slice(0, 500)));
    });
    child.on('error', reject);
  });
}

// ── Gateway Management ──
let gwProcess = null;

function checkPort(port) {
  return new Promise((resolve) => {
    const s = net.createConnection({ port, host: '127.0.0.1' });
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('error', () => resolve(false));
    s.setTimeout(1000, () => { s.destroy(); resolve(false); });
  });
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); } });
  });
}

function jsonRes(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ── HTTP Server ──
const server = http.createServer(async (req, res) => {
  // New user: openclaw not installed — show setup guide
  if (!openclawReady && (req.url === '/' || req.url === '/index.html')) {
    // Re-check in case user installed it without restarting
    try {
      require('child_process').execFileSync(OPENCLAW_BIN, ['--version'], { stdio: 'pipe', timeout: 5000 });
      openclawReady = true;
    } catch {}
    if (!openclawReady) { serveSetupPage(res); return; }
  }

  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(HTML_PATH, (err, data) => {
      if (err) { res.writeHead(500); res.end('Error loading page'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
  } else if (req.url === '/health') {
    jsonRes(res, 200, { ok: true, clients: wss ? wss.clients.size : 0 });

  } else if (req.url === '/api/config') {
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      const model = cfg.agents?.defaults?.model?.primary || '未配置';
      const aliases = cfg.agents?.defaults?.models || {};
      const workspace = cfg.agents?.defaults?.workspace || '';
      jsonRes(res, 200, { model, aliases, workspace });
    } catch (e) { jsonRes(res, 200, { model: '未知', aliases: {}, workspace: '' }); }

  } else if (req.url === '/api/gateway/status') {
    const running = await checkPort(GW_PORT);
    jsonRes(res, 200, { running, port: GW_PORT, managed: gwProcess !== null });

  } else if (req.url === '/api/gateway/start' && req.method === 'POST') {
    const running = await checkPort(GW_PORT);
    if (running) { jsonRes(res, 200, { ok: true, message: 'Gateway 已在运行' }); return; }
    console.log('[jarvis] 正在启动 Gateway…');
    try {
      gwProcess = spawn(OPENCLAW_BIN, ['gateway'], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: '0' },
      });
      let startOutput = '';
      gwProcess.stdout.on('data', (d) => { startOutput += d.toString(); });
      gwProcess.stderr.on('data', (d) => { startOutput += d.toString(); });
      gwProcess.on('error', (e) => { console.log('[jarvis] Gateway 启动失败:', e.message); gwProcess = null; });
      gwProcess.on('exit', (code) => { console.log('[jarvis] Gateway 进程退出 (' + code + ')'); gwProcess = null; });
      gwProcess.unref();
      // Wait up to 8s for port to become available
      let ok = false;
      for (let i = 0; i < 16; i++) {
        await new Promise(r => setTimeout(r, 500));
        if (await checkPort(GW_PORT)) { ok = true; break; }
      }
      if (ok) {
        console.log('[jarvis] Gateway 启动成功!');
        jsonRes(res, 200, { ok: true, message: 'Gateway 已启动' });
      } else {
        console.log('[jarvis] Gateway 启动超时，输出:', startOutput.slice(0, 500));
        jsonRes(res, 500, { ok: false, message: 'Gateway 启动超时', output: startOutput.slice(0, 500) });
      }
    } catch (e) {
      console.log('[jarvis] Gateway 启动异常:', e.message);
      jsonRes(res, 500, { ok: false, message: e.message });
    }

  } else if (req.url === '/api/gateway/stop' && req.method === 'POST') {
    const running = await checkPort(GW_PORT);
    if (!running) { jsonRes(res, 200, { ok: true, message: 'Gateway 未在运行' }); return; }
    console.log('[jarvis] 正在停止 Gateway…');
    try {
      // Find and kill the process on GW_PORT
      execFile('lsof', ['-ti:' + GW_PORT], (err, stdout) => {
        if (err || !stdout.trim()) { jsonRes(res, 200, { ok: true, message: 'Gateway 未在运行' }); return; }
        const myPid = process.pid;
        const pids = stdout.trim().split('\n').map(Number).filter(p => p && p !== myPid);
        for (const pid of pids) { try { process.kill(pid, 'SIGTERM'); } catch(e) {} }
        gwProcess = null;
        console.log('[jarvis] Gateway 已停止 (PIDs: ' + pids.join(',') + ')');
        jsonRes(res, 200, { ok: true, message: 'Gateway 已停止' });
      });
    } catch (e) {
      jsonRes(res, 500, { ok: false, message: e.message });
    }

  } else if (req.url === '/api/models/status') {
    try {
      const out = await runCli(['models', 'status', '--json']);
      const data = JSON.parse(out);
      jsonRes(res, 200, data);
    } catch (e) {
      jsonRes(res, 500, { error: e.message });
    }

  } else if (req.url === '/api/models/catalog') {
    try {
      if (catalogCache && (Date.now() - catalogCacheTime) < CATALOG_CACHE_TTL) {
        jsonRes(res, 200, catalogCache);
        return;
      }
      const out = await runCli(['models', 'list', '--all', '--json'], 30000);
      catalogCache = JSON.parse(out);
      catalogCacheTime = Date.now();
      jsonRes(res, 200, catalogCache);
    } catch (e) {
      if (catalogCache) { jsonRes(res, 200, catalogCache); return; }
      jsonRes(res, 500, { error: e.message });
    }

  } else if (req.url === '/api/models/set' && req.method === 'POST') {
    const body = await parseBody(req);
    const model = body.model;
    if (!model) { jsonRes(res, 400, { ok: false, message: 'Missing model' }); return; }
    try {
      await runCli(['models', 'set', model]);
      console.log('[jarvis] Model set: ' + model);
      jsonRes(res, 200, { ok: true, message: 'Model set to ' + model });
    } catch (e) {
      console.log('[jarvis] Model set failed:', e.message);
      jsonRes(res, 500, { ok: false, message: e.message });
    }

  } else if (req.url === '/api/auth/paste-token' && req.method === 'POST') {
    const body = await parseBody(req);
    const { profileId, token } = body;
    if (!profileId || !token) { jsonRes(res, 400, { ok: false, message: '缺少 profileId 或 token' }); return; }
    try {
      // Ensure directory exists
      const authDir = path.dirname(AUTH_PROFILES_PATH);
      if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
      // Read existing or create new
      let profiles;
      try { profiles = JSON.parse(fs.readFileSync(AUTH_PROFILES_PATH, 'utf8')); } catch { profiles = { profiles: {}, usageStats: {} }; }
      if (!profiles.profiles) profiles.profiles = {};
      // Auto-create profile if missing
      if (!profiles.profiles[profileId]) {
        const [provider] = profileId.split(':');
        profiles.profiles[profileId] = { provider, token: '', createdAt: new Date().toISOString() };
      }
      profiles.profiles[profileId].token = token;
      // Reset error stats
      if (!profiles.usageStats) profiles.usageStats = {};
      if (profiles.usageStats[profileId]) {
        profiles.usageStats[profileId].errorCount = 0;
        profiles.usageStats[profileId].lastFailureAt = null;
      }
      fs.writeFileSync(AUTH_PROFILES_PATH, JSON.stringify(profiles, null, 2), 'utf8');
      console.log('[jarvis] Token 已更新: ' + profileId);
      jsonRes(res, 200, { ok: true, message: 'Token 已更新' });
    } catch (e) {
      console.log('[jarvis] Token 更新失败:', e.message);
      jsonRes(res, 500, { ok: false, message: e.message });
    }

  } else if (req.url === '/api/auth/setup-token' && req.method === 'POST') {
    const body = await parseBody(req);
    const provider = body.provider || 'anthropic';
    console.log('[jarvis] 执行 setup-token (provider=' + provider + ')');
    try {
      // Run openclaw models auth setup-token non-interactively
      const child = spawn(OPENCLAW_BIN, ['models', 'auth', 'setup-token', '--provider', provider], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: '0', CI: '1' },
        timeout: 30000,
      });
      let out = '';
      child.stdout.on('data', d => { out += d.toString(); });
      child.stderr.on('data', d => { out += d.toString(); });
      child.on('close', (code) => {
        if (code === 0) {
          console.log('[jarvis] setup-token 成功');
          jsonRes(res, 200, { ok: true, message: 'Token 刷新成功', output: out.slice(0, 500) });
        } else {
          console.log('[jarvis] setup-token 失败 (code=' + code + '):', out.slice(0, 500));
          jsonRes(res, 200, { ok: false, message: 'setup-token 退出 code=' + code, output: out.slice(0, 500) });
        }
      });
      child.on('error', (e) => {
        jsonRes(res, 500, { ok: false, message: e.message });
      });
    } catch (e) {
      jsonRes(res, 500, { ok: false, message: e.message });
    }

  // ── QR Login SSE ──
  } else if (req.url.startsWith('/api/channels/qr-login') && req.method === 'GET') {
    const url = new URL(req.url, 'http://localhost');
    const ch = url.searchParams.get('channel');
    if (!ch) { res.writeHead(400); res.end('Missing channel'); return; }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Kill any existing login for same channel
    if (activeQrLogins[ch]) {
      try { activeQrLogins[ch].kill(); } catch {}
      delete activeQrLogins[ch];
    }

    console.log('[jarvis] QR login started: ' + ch);
    const child = spawn(OPENCLAW_BIN, ['channels', 'login', '--channel', ch], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    activeQrLogins[ch] = child;

    let lineBuf = '';
    let qrLines = [];

    function flushQr() {
      if (qrLines.length > 0) {
        const qrText = qrLines.join('\n');
        res.write('event: qr\ndata: ' + JSON.stringify(qrText) + '\n\n');
        qrLines = [];
      }
    }

    function isQrLine(line) {
      return line.length >= 10 && /[\u2588\u2580\u2584]/.test(line);
    }

    function processLine(line) {
      if (isQrLine(line)) {
        qrLines.push(line);
      } else {
        flushQr();
        const trimmed = line.trim();
        if (trimmed) {
          res.write('event: status\ndata: ' + JSON.stringify(trimmed) + '\n\n');
        }
      }
    }

    function onData(chunk) {
      lineBuf += chunk.toString();
      let idx;
      while ((idx = lineBuf.indexOf('\n')) !== -1) {
        const line = lineBuf.slice(0, idx);
        lineBuf = lineBuf.slice(idx + 1);
        processLine(line);
      }
    }

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    child.on('close', (code) => {
      // flush any remaining QR lines
      flushQr();
      if (lineBuf.trim()) processLine(lineBuf);
      console.log('[jarvis] QR login exited: ' + ch + ' code=' + code);
      res.write('event: done\ndata: ' + JSON.stringify({ code: code }) + '\n\n');
      res.end();
      delete activeQrLogins[ch];
    });
    child.on('error', (e) => {
      console.log('[jarvis] QR login error: ' + ch + ' ' + e.message);
      res.write('event: done\ndata: ' + JSON.stringify({ code: -1, error: e.message }) + '\n\n');
      res.end();
      delete activeQrLogins[ch];
    });

    req.on('close', () => {
      console.log('[jarvis] QR login client disconnected: ' + ch);
      try { child.kill(); } catch {}
      delete activeQrLogins[ch];
    });

  } else if (req.url === '/api/channels/qr-stop' && req.method === 'POST') {
    const body = await parseBody(req);
    const ch = body.channel;
    if (!ch) { jsonRes(res, 400, { ok: false, message: 'Missing channel' }); return; }
    if (activeQrLogins[ch]) {
      try { activeQrLogins[ch].kill(); } catch {}
      delete activeQrLogins[ch];
      console.log('[jarvis] QR login stopped: ' + ch);
      jsonRes(res, 200, { ok: true, message: 'QR login stopped' });
    } else {
      jsonRes(res, 200, { ok: true, message: 'No active QR login' });
    }

  // ── Channel Logout / Reconnect ──
  } else if (req.url === '/api/channels/logout' && req.method === 'POST') {
    const body = await parseBody(req);
    const ch = body.channel;
    if (!ch) { jsonRes(res, 400, { ok: false, message: 'Missing channel' }); return; }
    const args = ['channels', 'logout', '--channel', ch];
    if (body.account) args.push('--account', body.account);
    console.log('[jarvis] channels logout:', ch);
    try {
      const out = await runCli(args, 30000);
      console.log('[jarvis] channels logout OK:', ch);
      jsonRes(res, 200, { ok: true, message: 'Logged out', output: out.slice(0, 500) });
    } catch (e) {
      console.log('[jarvis] channels logout failed:', e.message);
      jsonRes(res, 500, { ok: false, message: e.message });
    }

  } else if (req.url === '/api/channels/reconnect' && req.method === 'POST') {
    const body = await parseBody(req);
    const ch = body.channel;
    if (!ch) { jsonRes(res, 400, { ok: false, message: 'Missing channel' }); return; }
    console.log('[jarvis] channels reconnect:', ch);
    try {
      const out = await runCli(['channels', 'login', '--channel', ch], 30000);
      console.log('[jarvis] channels reconnect OK:', ch);
      jsonRes(res, 200, { ok: true, message: 'Reconnected', output: out.slice(0, 500) });
    } catch (e) {
      console.log('[jarvis] channels reconnect failed:', e.message);
      jsonRes(res, 500, { ok: false, message: e.message });
    }

  // ── Channel Logs ──
  } else if (req.url.startsWith('/api/channels/logs') && req.method === 'GET') {
    const url = new URL(req.url, 'http://localhost');
    const ch = url.searchParams.get('channel') || 'all';
    const lines = url.searchParams.get('lines') || '100';
    try {
      const out = await runCli(['channels', 'logs', '--channel', ch, '--lines', lines, '--json'], 15000);
      const data = JSON.parse(out);
      jsonRes(res, 200, data);
    } catch (e) {
      jsonRes(res, 500, { error: e.message });
    }

  // ── Channel Status ──
  } else if (req.url === '/api/channels/status') {
    try {
      const out = await runCli(['channels', 'status'], 15000);
      jsonRes(res, 200, { ok: true, output: out });
    } catch (e) {
      jsonRes(res, 500, { error: e.message });
    }

  // ── Gateway Logs ──
  } else if (req.url.startsWith('/api/gateway/logs') && req.method === 'GET') {
    const url = new URL(req.url, 'http://localhost');
    const limit = url.searchParams.get('limit') || '100';
    try {
      const out = await runCli(['logs', '--limit', limit, '--json', '--no-color'], 30000);
      const lines = out.trim().split('\n').filter(Boolean);
      const entries = [];
      for (const line of lines) {
        try { entries.push(JSON.parse(line)); } catch {}
      }
      jsonRes(res, 200, { lines: entries });
    } catch (e) {
      // Fallback: try reading log file directly
      try {
        const today = new Date().toISOString().slice(0, 10);
        const logPath = '/tmp/openclaw/openclaw-' + today + '.log';
        const content = fs.readFileSync(logPath, 'utf8');
        const allLines = content.trim().split('\n');
        const last = allLines.slice(-parseInt(limit));
        const entries = [];
        for (const line of last) {
          try { entries.push(JSON.parse(line)); } catch {}
        }
        jsonRes(res, 200, { lines: entries, source: 'file' });
      } catch (e2) {
        jsonRes(res, 500, { error: e.message });
      }
    }

  // ── Sessions ──
  } else if (req.url === '/api/sessions') {
    try {
      const out = await runCli(['sessions', '--json'], 15000);
      const data = JSON.parse(out);
      jsonRes(res, 200, data);
    } catch (e) {
      jsonRes(res, 500, { error: e.message });
    }

  // ── Model Fallbacks ──
  } else if (req.url === '/api/models/fallbacks') {
    try {
      const out = await runCli(['models', 'status', '--json'], 15000);
      const data = JSON.parse(out);
      jsonRes(res, 200, { fallbacks: data.fallbacks || [] });
    } catch (e) {
      jsonRes(res, 500, { error: e.message });
    }

  } else if (req.url === '/api/models/fallbacks/add' && req.method === 'POST') {
    const body = await parseBody(req);
    const model = body.model;
    if (!model) { jsonRes(res, 400, { ok: false, message: 'Missing model' }); return; }
    try {
      await runCli(['models', 'fallbacks', 'add', model], 15000);
      console.log('[jarvis] fallback added:', model);
      jsonRes(res, 200, { ok: true, message: 'Fallback added' });
    } catch (e) {
      jsonRes(res, 500, { ok: false, message: e.message });
    }

  } else if (req.url === '/api/models/fallbacks/remove' && req.method === 'POST') {
    const body = await parseBody(req);
    const model = body.model;
    if (!model) { jsonRes(res, 400, { ok: false, message: 'Missing model' }); return; }
    try {
      await runCli(['models', 'fallbacks', 'remove', model], 15000);
      console.log('[jarvis] fallback removed:', model);
      jsonRes(res, 200, { ok: true, message: 'Fallback removed' });
    } catch (e) {
      jsonRes(res, 500, { ok: false, message: e.message });
    }

  // ── Doctor ──
  } else if (req.url === '/api/doctor' && req.method === 'POST') {
    console.log('[jarvis] running doctor…');
    try {
      const out = await runCli(['doctor', '--non-interactive'], 60000);
      // Strip ANSI codes
      const clean = out.replace(/\x1b\[[0-9;]*m/g, '');
      console.log('[jarvis] doctor completed');
      jsonRes(res, 200, { ok: true, output: clean });
    } catch (e) {
      const clean = (e.message || '').replace(/\x1b\[[0-9;]*m/g, '');
      jsonRes(res, 200, { ok: false, output: clean });
    }

  // ── Channel Management API ──
  } else if (req.url === '/api/channels/list') {
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      jsonRes(res, 200, { channels: cfg.channels || {}, plugins: cfg.plugins || {} });
    } catch (e) { jsonRes(res, 200, { channels: {}, plugins: {} }); }

  } else if (req.url === '/api/channels/add' && req.method === 'POST') {
    const body = await parseBody(req);
    const ch = body.channel;
    if (!ch) { jsonRes(res, 400, { ok: false, message: 'Missing channel' }); return; }
    // Map camelCase fields to CLI flags
    const flagMap = {
      token: '--token', botToken: '--bot-token', appToken: '--app-token',
      account: '--account', signalNumber: '--signal-number',
      phoneNumber: '--phone-number', host: '--host', port: '--port',
      password: '--password', username: '--username', apiKey: '--api-key',
      webhook: '--webhook', appId: '--app-id', appSecret: '--app-secret',
    };
    const args = ['channels', 'add', '--channel', ch];
    for (const [key, flag] of Object.entries(flagMap)) {
      if (body[key]) args.push(flag, String(body[key]));
    }
    console.log('[jarvis] channels add:', args.join(' '));
    try {
      const out = await runCli(args, 30000);
      console.log('[jarvis] channels add OK');
      jsonRes(res, 200, { ok: true, message: 'Channel added', output: out.slice(0, 500) });
    } catch (e) {
      console.log('[jarvis] channels add failed:', e.message);
      jsonRes(res, 500, { ok: false, message: e.message });
    }

  } else if (req.url === '/api/channels/remove' && req.method === 'POST') {
    const body = await parseBody(req);
    const ch = body.channel;
    if (!ch) { jsonRes(res, 400, { ok: false, message: 'Missing channel' }); return; }
    const args = ['channels', 'remove', '--channel', ch, '--delete'];
    if (body.account) args.push('--account', body.account);
    console.log('[jarvis] channels remove:', args.join(' '));
    try {
      const out = await runCli(args, 15000);
      console.log('[jarvis] channels remove OK');
      jsonRes(res, 200, { ok: true, message: 'Channel removed', output: out.slice(0, 500) });
    } catch (e) {
      console.log('[jarvis] channels remove failed:', e.message);
      jsonRes(res, 500, { ok: false, message: e.message });
    }

  } else if (req.url.startsWith('/api/channels/config') && req.method === 'GET') {
    const url = new URL(req.url, 'http://localhost');
    const ch = url.searchParams.get('channel');
    if (!ch) { jsonRes(res, 400, { error: 'Missing channel param' }); return; }
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      const channelCfg = cfg.channels?.[ch] || {};
      const pluginCfg = cfg.plugins?.entries?.[ch] || {};
      jsonRes(res, 200, { channel: ch, config: channelCfg, plugin: pluginCfg });
    } catch (e) { jsonRes(res, 500, { error: e.message }); }

  } else if (req.url === '/api/channels/config' && req.method === 'POST') {
    const body = await parseBody(req);
    const ch = body.channel;
    const config = body.config;
    if (!ch || !config) { jsonRes(res, 400, { ok: false, message: 'Missing channel or config' }); return; }
    try {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
      const cfg = JSON.parse(raw);
      if (!cfg.channels) cfg.channels = {};
      cfg.channels[ch] = { ...(cfg.channels[ch] || {}), ...config };
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
      console.log('[jarvis] channel config updated: ' + ch);
      jsonRes(res, 200, { ok: true, message: 'Config updated' });
    } catch (e) {
      console.log('[jarvis] channel config failed:', e.message);
      jsonRes(res, 500, { ok: false, message: e.message });
    }

  } else {
    // Serve static assets (.glb, .gltf, .bin, .jpg, .png) from jarvis directory
    const STATIC_EXT = { '.glb':'model/gltf-binary', '.gltf':'model/gltf+json', '.bin':'application/octet-stream', '.jpg':'image/jpeg', '.png':'image/png' };
    const ext = path.extname(req.url).toLowerCase();
    if (STATIC_EXT[ext]) {
      const safeName = path.basename(req.url);
      const filePath = path.join(__dirname, safeName);
      fs.stat(filePath, (err, stat) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, {
          'Content-Type': STATIC_EXT[ext],
          'Content-Length': stat.size,
          'Cache-Control': 'public, max-age=86400'
        });
        fs.createReadStream(filePath).pipe(res);
      });
    } else {
      res.writeHead(302, { Location: '/' });
      res.end();
    }
  }
});

// ── WebSocket Proxy ──
if (!WS) { console.log('[jarvis] WebSocket proxy skipped (ws module unavailable)'); }
const wss = WS ? new WS.WebSocketServer({ server, path: '/ws' }) : null;

if (wss) wss.on('connection', (browser) => {
  console.log('[jarvis] 浏览器已连接');

  const gw = new WS(GW_WS);
  let gwReady = false;
  let authenticated = false;
  const queue = [];
  let pendingBrowserConnectId = null; // browser's connect req id, awaiting auth

  gw.on('open', () => {
    gwReady = true;
    console.log('[jarvis] 已连接 Gateway WS');
  });

  // Gateway → Browser (proxy all messages, but intercept auth flow)
  gw.on('message', (data) => {
    const raw = data.toString();
    let frame;
    try { frame = JSON.parse(raw); } catch { return; }

    // Intercept connect.challenge — do auth on behalf of browser
    if (frame.type === 'event' && frame.event === 'connect.challenge') {
      console.log('[jarvis] 收到挑战，代理认证中…');
      const connectMsg = {
        type: 'req', id: '__jarvis_auth__', method: 'connect',
        params: {
          minProtocol: 3, maxProtocol: 3,
          client: {
            id: 'gateway-client',
            displayName: 'JARVIS Monitor',
            version: '1.0.0',
            platform: process.platform,
            mode: 'backend',
            instanceId: 'jarvis-' + Date.now()
          },
          role: 'operator',
          scopes: ['operator.admin', 'operator.read', 'operator.write'],
          caps: ['tool-events'],
          auth: { token: GW_TOKEN }
        }
      };
      gw.send(JSON.stringify(connectMsg));
      // Also forward challenge to browser so it knows what's happening
      if (browser.readyState === WS.OPEN) browser.send(raw);
      return;
    }

    // Intercept auth response
    if (frame.type === 'res' && frame.id === '__jarvis_auth__') {
      if (frame.ok) {
        authenticated = true;
        console.log('[jarvis] 认证成功! 服务器:', frame.payload?.server?.version);
        // Forward as hello-ok to browser (rewrite id so browser can match)
        // Browser expects this as a response to its own connect request
        // We'll store the hello payload and send it when browser sends connect
      } else {
        console.log('[jarvis] 认证失败:', frame.error?.message);
      }
      // Store hello payload to replay to browser
      gw.__helloPayload = frame;
      // If browser already sent connect, replay now
      if (pendingBrowserConnectId) {
        console.log('[jarvis] 回放认证结果给浏览器 (id=' + pendingBrowserConnectId + ')');
        const reply = { ...frame, id: pendingBrowserConnectId };
        if (browser.readyState === WS.OPEN) browser.send(JSON.stringify(reply));
        pendingBrowserConnectId = null;
      }
      // Flush queue
      for (const msg of queue) gw.send(msg);
      queue.length = 0;
      return;
    }

    // Forward everything else to browser
    if (browser.readyState === WS.OPEN) browser.send(raw);
  });

  // Browser → Gateway
  browser.on('message', (data) => {
    const raw = data.toString();
    let frame;
    try { frame = JSON.parse(raw); } catch {
      if (gwReady && authenticated) gw.send(raw);
      return;
    }

    // Intercept browser's connect request — respond with cached hello-ok
    if (frame.type === 'req' && frame.method === 'connect') {
      if (gw.__helloPayload) {
        console.log('[jarvis] 浏览器发送 connect，立即回放认证结果');
        const reply = { ...gw.__helloPayload, id: frame.id };
        if (browser.readyState === WS.OPEN) browser.send(JSON.stringify(reply));
      } else {
        console.log('[jarvis] 浏览器发送 connect，等待认证完成…');
        pendingBrowserConnectId = frame.id;
      }
      return;
    }

    // Forward other messages to gateway
    if (authenticated && gw.readyState === WS.OPEN) {
      gw.send(raw);
    } else {
      queue.push(raw);
    }
  });

  // Cleanup
  gw.on('close', (code) => {
    console.log('[jarvis] Gateway 断开 (' + code + ')');
    if (browser.readyState === WS.OPEN) browser.close(1001, 'Gateway disconnected');
  });
  gw.on('error', (e) => {
    console.log('[jarvis] Gateway 错误:', e.message);
    if (browser.readyState === WS.OPEN) browser.close(1011, 'Gateway error');
  });
  browser.on('close', () => {
    console.log('[jarvis] 浏览器断开');
    if (gw.readyState === WS.OPEN) gw.close();
  });
  browser.on('error', () => {
    if (gw.readyState === WS.OPEN) gw.close();
  });
});

// Also fix health endpoint to handle missing wss
server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║   JARVIS — OpenClaw Monitor          ║');
  console.log('  ╠══════════════════════════════════════╣');
  console.log('  ║   http://localhost:' + PORT + '              ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
});
