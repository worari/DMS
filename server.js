const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// MIME types mapping
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.gs': 'text/plain; charset=utf-8',
};

// Security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// CORS headers for API/GAS proxy requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  let filePath = '.' + req.url.split('?')[0]; // Remove query params
  if (filePath === './') filePath = './index.html';

  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback: serve index.html for unmatched routes
      if (ext === '' || ext === '.html') {
        fs.readFile('./index.html', (err2, indexData) => {
          if (err2) {
            res.writeHead(404, { ...securityHeaders, 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
          } else {
            res.writeHead(200, { ...securityHeaders, 'Content-Type': mimeTypes['.html'] });
            res.end(indexData);
          }
        });
      } else {
        res.writeHead(404, { ...securityHeaders, 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      }
    } else {
      const headers = {
        ...securityHeaders,
        ...corsHeaders,
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
      };
      res.writeHead(200, headers);
      res.end(data);
    }
  });
}).listen(PORT, () => {
  console.log(`✅ ระบบข้อมูลหนี้สินกำลังพล (DMS)`);
  console.log(`🌐 Server running at http://localhost:${PORT}/`);
  console.log(`📁 Serving files from: ${process.cwd()}`);
  console.log(`🔧 Press Ctrl+C to stop`);
});
