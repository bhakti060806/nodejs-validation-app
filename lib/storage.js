'use strict';
/**
 * Custom module: storage.js
 * Simple JSON-file database using the NodeJS 'fs' module and 'crypto' for password hashing.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '..', 'data', 'users.json');

function ensureFile() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}

function readUsers() {
  ensureFile();
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}

function writeUsers(users) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

function emailExists(email) {
  return readUsers().some((u) => u.email === email);
}

function addUser(clean) {
  const users = readUsers();
  const user = {
    id: users.length ? users[users.length - 1].id + 1 : 1,
    name: clean.name,
    email: clean.email,
    phone: clean.phone,
    age: clean.age,
    course: clean.course,
    passwordHash: hashPassword(clean.password),
    createdAt: new Date().toISOString()
  };
  users.push(user);
  writeUsers(users);
  return user;
}

// never expose the password hash
function publicUser(u) {
  const { passwordHash, ...safe } = u;
  return safe;
}

module.exports = { readUsers, addUser, emailExists, publicUser, DATA_FILE, ensureFile };
