'use strict';

/**
 * Minimal durable store for bookings, enquiries and newsletter signups.
 * JSON-on-disk with atomic writes and a serialised queue: right-sized for a
 * sales-assisted tour operator, and trivially swappable for Postgres later
 * (the public surface is four functions).
 */

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'bookings.json');

let chain = Promise.resolve();

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({ bookings: [], enquiries: [], newsletter: [], events: [] }, null, 2));
}

function read() {
  ensure();
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (err) {
    console.error('[store] corrupt bookings.json, starting fresh. ' + err.message);
    return { bookings: [], enquiries: [], newsletter: [], events: [] };
  }
}

function write(data) {
  ensure();
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, FILE);
}

/** Serialise every mutation so concurrent bookings cannot clobber each other. */
function tx(fn) {
  const run = chain.then(async () => {
    const data = read();
    const out = await fn(data);
    write(data);
    return out;
  });
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

const publicStatus = (b) => b;

async function createBooking(payload) {
  return tx((db) => {
    db.bookings.unshift(payload);
    db.events.unshift({ at: new Date().toISOString(), type: 'booking.created', ref: payload.reference });
    return payload;
  });
}

async function findBooking(reference) {
  if (!reference) return null;
  const ref = String(reference).trim().toUpperCase();
  return tx((db) => db.bookings.find((b) => b.reference === ref) || null);
}

async function updateBooking(reference, patch) {
  return tx((db) => {
    const i = db.bookings.findIndex((b) => b.reference === String(reference).trim().toUpperCase());
    if (i === -1) return null;
    db.bookings[i] = { ...db.bookings[i], ...patch, updatedAt: new Date().toISOString() };
    db.events.unshift({ at: new Date().toISOString(), type: patch.status || 'booking.updated', ref: reference });
    return db.bookings[i];
  });
}

async function listBookings({ limit = 50 } = {}) {
  return tx((db) => db.bookings.slice(0, limit));
}

async function addEnquiry(enquiry) {
  return tx((db) => {
    db.enquiries.unshift({ ...enquiry, at: new Date().toISOString() });
    db.enquiries = db.enquiries.slice(0, 400);
    return true;
  });
}

async function addNewsletter(email, meta = {}) {
  return tx((db) => {
    if (db.newsletter.some((n) => n.email === email)) return { ok: true, duplicate: true };
    db.newsletter.unshift({ email, ...meta, at: new Date().toISOString() });
    db.newsletter = db.newsletter.slice(0, 2000);
    return { ok: true };
  });
}

function refsInUse() {
  return tx((db) => db.bookings.map((b) => b.reference));
}

module.exports = { createBooking, findBooking, updateBooking, listBookings, addEnquiry, addNewsletter, refsInUse, DATA_DIR, FILE, publicStatus };
