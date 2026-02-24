import { createClient } from '@libsql/client';
import { mkdirSync } from 'fs';
import { join } from 'path';

// Production (Vercel + Turso): set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN env vars.
// Local dev fallback: SQLite file. Vercel serverless only allows writes to /tmp.
const url = process.env.TURSO_DATABASE_URL ?? (() => {
  const isServerless = !!process.env.VERCEL;
  const dir = isServerless ? '/tmp' : join(process.cwd(), 'data');
  if (!isServerless) mkdirSync(dir, { recursive: true });
  return `file:${join(dir, 'local.db')}`;
})();

export const db = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

let schemaReady = false;

export async function ensureSchema() {
  if (schemaReady) return;
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS thoughts (
      date        TEXT    PRIMARY KEY,
      content     TEXT    NOT NULL,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint     TEXT    UNIQUE NOT NULL,
      p256dh       TEXT    NOT NULL,
      auth         TEXT    NOT NULL,
      notify_time  TEXT    NOT NULL DEFAULT '09:00',
      created_at   INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT    PRIMARY KEY,
      username      TEXT    UNIQUE NOT NULL,
      bio           TEXT,
      email         TEXT    UNIQUE NOT NULL,
      password_hash TEXT    NOT NULL,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  // Add user_id to thoughts if not already present (SQLite doesn't support IF NOT EXISTS for ALTER)
  try {
    await db.execute('ALTER TABLE thoughts ADD COLUMN user_id TEXT REFERENCES users(id)');
  } catch (e) {
    if (!e.message?.includes('duplicate column name')) throw e;
  }
  schemaReady = true;
}

// Convert a libsql Row (array-like) to a plain JS object using column names.
export function rowToObj(row, columns) {
  const obj = {};
  columns.forEach((col, i) => { obj[col] = row[i]; });
  return obj;
}
