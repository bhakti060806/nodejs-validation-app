'use strict';
/**
 * Server-Side Validation Application using NodeJS
 * Uses ONLY core modules: http, fs, path, stream, events, crypto (+ own custom modules in /lib)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');

const { validateRegistration } = require('./lib/validator');
const storage = require('./lib/storage');
const { appEvents, counters, LOG_FILE } = require('./lib/appEvents');
const { usersToCsvStream } = require('./lib/csvStream');

const PORT = process.env.PORT || 3000;
const MAX_BODY = 10 * 1024; // 10 KB limit -> 413 if exceeded
const PUBLIC_DIR = path.join(__dirname, 'public');

storage.ensureFile();

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function reject(res, status, message, extra = {}) {
  appEvents.emit('rejected', { status, reason: message });
  sendJson(res, status, { success: false, status, message, ...extra });
}

// read body safely (size limited)
function readBody(req) {
  return new Promise((resolve, reject_) => {
    let size = 0;
    let tooBig = false;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) { tooBig = true; return; } // keep draining, stop storing
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooBig) return reject_({ status: 413, message: 'Payload too large (max 10 KB)' });
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', () => reject_({ status: 400, message: 'Could not read request body' }));
  });
}

async function handleRegister(req, res) {
  const type = (req.headers['content-type'] || '').split(';')[0].trim();
  if (type !== 'application/json') return reject(res, 415, 'Content-Type must be application/json');

  let raw;
  try { raw = await readBody(req); }
  catch (e) { return reject(res, e.status || 400, e.message); }

  let body;
  try { body = JSON.parse(raw); }
  catch { return reject(res, 400, 'Request body is not valid JSON'); }

  const result = validateRegistration(body);
  if (!result.valid) return reject(res, 400, 'Validation failed', { errors: result.errors });

  if (storage.emailExists(result.clean.email)) {
    return reject(res, 409, 'Email is already registered', { errors: { email: 'Email is already registered' } });
  }

  const user = storage.addUser(result.clean);
  appEvents.emit('registered', user);
  sendJson(res, 201, { success: true, status: 201, message: 'Registration successful', user: storage.publicUser(user) });
}

function serveStatic(res, file, type) {
  const filePath = path.join(PUBLIC_DIR, file);
  fs.readFile(filePath, (err, data) => {
    if (err) return reject(res, 404, 'File not found');
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  appEvents.emit('request', req);
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const route = url.pathname;
  const method = req.method;

  try {
    // ---------- GET routes ----------
    if (route === '/' && method === 'GET') return serveStatic(res, 'index.html', 'text/html; charset=utf-8');
    if (route === '/style.css' && method === 'GET') return serveStatic(res, 'style.css', 'text/css; charset=utf-8');

    if (route === '/api/health' && method === 'GET') {
      return sendJson(res, 200, { success: true, status: 'running', uptimeSeconds: Math.round(process.uptime()), node: process.version, stats: counters });
    }

    if (route === '/api/users' && method === 'GET') {
      const users = storage.readUsers().map(storage.publicUser);
      return sendJson(res, 200, { success: true, count: users.length, users });
    }

    // STREAM: users -> Transform (CSV) -> response
    if (route === '/api/users/export' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="users.csv"' });
      const users = storage.readUsers().map(storage.publicUser);
      return pipeline(usersToCsvStream(users), res, () => {});
    }

    // STREAM: log file -> response
    if (route === '/api/logs' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return pipeline(fs.createReadStream(LOG_FILE), res, () => {});
    }

    // ---------- POST routes ----------
    if (route === '/api/register' && method === 'POST') return handleRegister(req, res);

    // ---------- known path, wrong method ----------
    const known = ['/', '/api/health', '/api/users', '/api/users/export', '/api/logs', '/api/register'];
    if (known.includes(route)) {
      res.setHeader('Allow', route === '/api/register' ? 'POST' : 'GET');
      return reject(res, 405, `Method ${method} not allowed on ${route}`);
    }

    return reject(res, 404, `Route ${route} not found`);
  } catch (err) {
    console.error(err);
    return reject(res, 500, 'Internal server error');
  }
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
module.exports = server;
