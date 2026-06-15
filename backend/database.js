const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT
  );

  CREATE TABLE IF NOT EXISTS policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    policy_number TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    insurer TEXT NOT NULL,
    expiration_date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    policy_id INTEGER NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('follow_up', 'renewal')),
    date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    result TEXT CHECK(result IN ('contacted', 'no_answer', 'call_later', 'interested', 'not_interested')),
    note TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_policies_expiration_date ON policies(expiration_date);
`);

module.exports = db;
