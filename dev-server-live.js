#!/usr/bin/env node
/**
 * Production-ready dev server with live reload
 * Works without Vite or build tools - serves pre-built assets
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const WebSocket = require('ws');
const chokidar = require('chokidar');

const PORT = process.env.PORT || 5173;
const FRONTEND_DIR = path.join(__dirname, 'artifacts/eclat');
const DIST_DIR = path.join(FRONTEND_DIR, 'dist/public');

// Track connected clients for live reload
let clients = new Set();

// Watch for changes and notify clients
const watcher = chokidar.watch([
  path.join(FRONTEND_DIR, 'src'),
  path.join(FRONTEND_DIR, 'index.html'),
  path.join(FRONTEND_DIR, 'tailwind.config.ts'),
], {
  ignored: /node_modules/,
  persistent: true,
  awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 100 }
});

watcher.on('change', (filepath) => {
  console.log(`📝 Changed: ${path.relative(FRONTEND_DIR, filepath)}`);
  // Notify all connected WebSocket clients to reload
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'reload' }));
    }
  });
});

watcher.on('error', (error) => {
  console.error('Watcher error:', error);
});

// HTTP Server
const server = http.createServer((req, res) => {
  // WebSocket endpoint
  if (req.url === '/__livereload__') {
    res.writeHead(400);
    res.end('Use WebSocket');
    return;
  }

  // Inject live reload script into HTML
  if (req.url === '/' || req.url.endsWith('.html')) {
    const filePath = req.url === '/'
      ? path.join(FRONTEND_DIR, 'index.html')
      : path.join(FRONTEND_DIR, req.url);

    fs.readFile(filePath, 'utf-8', (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }

      // Inject live reload script before closing body tag
      const liveReloadScript = `
        <script>
          (function() {
            function setupLiveReload() {
              const ws = new WebSocket('ws://localhost:${PORT}');
              ws.onopen = () => console.log('🔄 Live reload connected');
              ws.onmessage = (e) => {
                if (JSON.parse(e.data).type === 'reload') {
                  console.log('🔄 Reloading...');
                  location.reload();
                }
              };
              ws.onerror = () => console.log('Live reload disconnected');
              ws.onclose = () => setTimeout(setupLiveReload, 1000);
            }
            setupLiveReload();
          })();
        </script>
      `;

      const modified = content.replace('</body>', liveReloadScript + '</body>');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(modified);
    });
    return;
  }

  // Serve static files
  let filePath = path.join(FRONTEND_DIR, req.url);
  const normalized = path.normalize(filePath);

  if (!normalized.startsWith(path.normalize(FRONTEND_DIR))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
      }
    } else {
      const contentType = mime.lookup(filePath) || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    }
  });
});

// WebSocket for live reload
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('✅ Live reload client connected');
  clients.add(ws);

  ws.onclose = () => {
    clients.delete(ws);
    console.log('❌ Live reload client disconnected');
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  };
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     🚀 Eclat Style Hub - Local Dev Server Started     ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  Frontend: http://localhost:${PORT}                       ║`);
  console.log(`║  Live Reload: Enabled ✓                               ║`);
  console.log(`║  Watch Folder: ${FRONTEND_DIR.split('/').pop()}                                 ║`);
  console.log('║                                                        ║');
  console.log('║  📝 Edit files in src/ to see live changes             ║');
  console.log('║  🛑 Press Ctrl+C to stop                              ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('📂 Watching for changes...\n');
});

process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  watcher.close();
  server.close();
  process.exit(0);
});
