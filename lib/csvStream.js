'use strict';
/**
 * Custom module: csvStream.js
 * Demonstrates NodeJS STREAMS: Readable.from() -> Transform -> HTTP response (pipeline).
 */
const { Readable, Transform } = require('stream');

function toCsvTransform() {
  let first = true;
  return new Transform({
    writableObjectMode: true,
    transform(user, _enc, cb) {
      let out = '';
      if (first) { out += 'id,name,email,phone,age,course,createdAt\n'; first = false; }
      const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
      out += [user.id, user.name, user.email, user.phone, user.age, user.course, user.createdAt].map(esc).join(',') + '\n';
      cb(null, out);
    },
    flush(cb) { if (first) this.push('id,name,email,phone,age,course,createdAt\n'); cb(); }
  });
}

function usersToCsvStream(users) {
  return Readable.from(users).pipe(toCsvTransform());
}

module.exports = { usersToCsvStream };
