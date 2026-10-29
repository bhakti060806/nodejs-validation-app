'use strict';
/**
 * Simple automated test: starts the server on port 4010 and sends valid + invalid requests.
 * Run:  npm test
 */
process.env.PORT = 4010;
const fs = require('fs');
const path = require('path');
const dataFile = path.join(__dirname, '..', 'data', 'users.json');
fs.mkdirSync(path.dirname(dataFile), { recursive: true });
fs.writeFileSync(dataFile, '[]'); // start clean

const server = require('../server');
const BASE = 'http://localhost:4010';
let pass = 0, fail = 0;

const valid = { name: 'Bhakti Khanzode', email: 'bhakti@example.com', phone: '9876543210', age: 20, course: 'Computer Engineering', password: 'Strong@123', confirmPassword: 'Strong@123' };

async function post(body, headers = { 'Content-Type': 'application/json' }) {
  const res = await fetch(BASE + '/api/register', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
  return { status: res.status, data: await res.json() };
}
function check(label, actual, expected) {
  const ok = actual === expected;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  (expected ${expected}, got ${actual})`);
}

(async () => {
  await new Promise((r) => setTimeout(r, 300));
  check('GET /api/health', (await fetch(BASE + '/api/health')).status, 200);
  check('Valid registration -> 201', (await post(valid)).status, 201);
  check('Duplicate email -> 409', (await post(valid)).status, 409);
  check('Empty body fields -> 400', (await post({})).status, 400);
  check('Bad email -> 400', (await post({ ...valid, email: 'abc' })).status, 400);
  check('Bad phone -> 400', (await post({ ...valid, email: 'a@b.com', phone: '12345' })).status, 400);
  check('Under-age -> 400', (await post({ ...valid, email: 'c@d.com', age: 10 })).status, 400);
  check('Weak password -> 400', (await post({ ...valid, email: 'e@f.com', password: 'abc', confirmPassword: 'abc' })).status, 400);
  check('Password mismatch -> 400', (await post({ ...valid, email: 'g@h.com', confirmPassword: 'Other@123' })).status, 400);
  check('Malformed JSON -> 400', (await post('{bad json')).status, 400);
  check('Wrong Content-Type -> 415', (await post('x=1', { 'Content-Type': 'text/plain' })).status, 415);
  check('Oversized body -> 413', (await post({ ...valid, name: 'A'.repeat(20000) })).status, 413);
  check('GET /api/register -> 405', (await fetch(BASE + '/api/register')).status, 405);
  check('Unknown route -> 404', (await fetch(BASE + '/nope')).status, 404);
  const users = await (await fetch(BASE + '/api/users')).json();
  check('Only 1 user stored', users.count, 1);
  check('Password hash not exposed', 'passwordHash' in users.users[0], false);
  const csv = await (await fetch(BASE + '/api/users/export')).text();
  check('CSV stream has header + 1 row', csv.trim().split('\n').length, 2);
  console.log(`\n${pass} passed, ${fail} failed`);
  fs.writeFileSync(dataFile, '[]');
  server.close();
  setTimeout(() => process.exit(fail ? 1 : 0), 200);
})();
