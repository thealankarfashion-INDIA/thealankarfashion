#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

const PORT = process.env.PORT || 5173;
const FRONTEND_DIR = path.join(__dirname, 'artifacts/eclat');

const server = http.createServer((req, res) => {
  // Redirect root to index.html
  let filePath;
  if (req.url === '/') {
    filePath = path.join(FRONTEND_DIR, 'index.html');
  } else {
    filePath = path.join(FRONTEND_DIR, req.url);
  }

  // Security: prevent directory traversal
  const normalized = path.normalize(filePath);
  if (!normalized.startsWith(path.normalize(FRONTEND_DIR))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Try index.html for directory requests
        const indexPath = path.join(filePath, 'index.html');
        fs.readFile(indexPath, (indexErr, indexContent) => {
          if (indexErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(indexContent);
          }
        });
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
      }
    } else {
      const contentType = mime.lookup(filePath) || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Dev server running at http://localhost:${PORT}\n`);
  console.log(`Frontend: ${FRONTEND_DIR}`);
  console.log('Press Ctrl+C to stop\n');
});
