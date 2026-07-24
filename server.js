// Huyoza Model Agency — backend server
// Pure Node.js, zero npm dependencies. Stores applications in a local JSON file.
// Run with: node server.js
// Set ADMIN_PASSWORD as an environment variable before starting in production.

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const DB_FILE = path.join(__dirname, 'applications.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// ---------- tiny JSON "database" ----------
function readApplications() {
  if (!fs.existsSync(DB_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeApplications(apps) {
  fs.writeFileSync(DB_FILE, JSON.stringify(apps, null, 2));
}

// ---------- helpers ----------
function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) req.destroy(); // 1MB cap, basic abuse guard
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function isAuthorized(req) {
  const supplied = req.headers['x-admin-password'];
  return supplied === ADMIN_PASSWORD;
}

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function serveStatic(req, res) {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(PUBLIC_DIR, path.normalize(filePath).replace(/^(\.\.[\/\\])+/, ''));

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

// ---------- request handler ----------
const server = http.createServer(async (req, res) => {
  // CORS (harmless to leave on; tighten to your real domain in production)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // POST /api/apply — public, accepts a new application
  if (url.pathname === '/api/apply' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));

      const required = ['name', 'contact', 'age', 'location', 'hours', 'comfort', 'start'];
      for (const field of required) {
        if (!body[field] || String(body[field]).trim() === '') {
          return sendJSON(res, 400, { error: `Missing field: ${field}` });
        }
      }
      const age = Number(body.age);
      if (!Number.isFinite(age) || age < 18) {
        return sendJSON(res, 400, { error: 'Applicants must be 18 or older.' });
      }

      const application = {
        id: crypto.randomUUID(),
        submittedAt: new Date().toISOString(),
        status: 'new',
        name: String(body.name).slice(0, 200),
        contact: String(body.contact).slice(0, 200),
        age,
        location: String(body.location).slice(0, 200),
        existing: String(body.existing || '').slice(0, 500),
        hours: String(body.hours).slice(0, 100),
        comfort: String(body.comfort).slice(0, 100),
        start: String(body.start).slice(0, 200),
        questions: String(body.questions || '').slice(0, 1000),
      };

      const apps = readApplications();
      apps.push(application);
      writeApplications(apps);

      return sendJSON(res, 201, { ok: true });
    } catch (err) {
      return sendJSON(res, 400, { error: 'Invalid request body.' });
    }
  }

  // GET /api/applications — admin only, list everything
  if (url.pathname === '/api/applications' && req.method === 'GET') {
    if (!isAuthorized(req)) return sendJSON(res, 401, { error: 'Unauthorized' });
    const apps = readApplications().sort(
      (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
    );
    return sendJSON(res, 200, apps);
  }

  // PATCH /api/applications/:id — admin only, update status
  if (url.pathname.startsWith('/api/applications/') && req.method === 'PATCH') {
    if (!isAuthorized(req)) return sendJSON(res, 401, { error: 'Unauthorized' });
    const id = url.pathname.split('/').pop();
    try {
      const { status } = JSON.parse(await readBody(req));
      const apps = readApplications();
      const app = apps.find((a) => a.id === id);
      if (!app) return sendJSON(res, 404, { error: 'Not found' });
      app.status = status;
      writeApplications(apps);
      return sendJSON(res, 200, { ok: true });
    } catch {
      return sendJSON(res, 400, { error: 'Invalid request body.' });
    }
  }

  // everything else -> static files (the public site + admin dashboard)
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Huyoza Agency server running on http://localhost:${PORT}`);
  console.log(`Admin dashboard: http://localhost:${PORT}/admin.html`);
});
