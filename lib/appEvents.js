'use strict';
/**
 * Custom module: appEvents.js
 * Demonstrates the NodeJS 'events' module (EventEmitter).
 * The server emits events; listeners write them to a log file using a WRITE STREAM.
 */
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class AppEvents extends EventEmitter {}
const appEvents = new AppEvents();

const LOG_FILE = path.join(__dirname, '..', 'data', 'server.log');
fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

const counters = { requests: 0, registered: 0, rejected: 0 };

function log(type, message) {
  const line = `${new Date().toISOString()} [${type}] ${message}\n`;
  logStream.write(line);
  process.stdout.write(line);
}

appEvents.on('request', (req) => { counters.requests++; log('REQUEST', `${req.method} ${req.url}`); });
appEvents.on('registered', (user) => { counters.registered++; log('REGISTERED', user.email); });
appEvents.on('rejected', (info) => { counters.rejected++; log('REJECTED', `${info.status} ${info.reason}`); });

module.exports = { appEvents, counters, LOG_FILE };
