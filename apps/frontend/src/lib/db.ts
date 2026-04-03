import { Database } from "bun:sqlite";

const DB_PATH = process.env.SQLITE_DB_PATH ?? "/data/users.db";

export const createDb = () => {
  const db = new Database(DB_PATH, { create: true });

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    UNIQUE NOT NULL,
      password_hash TEXT    NOT NULL
    )
  `);

  return db;
};

let _defaultDb: Database | undefined;

const getDefaultDb = () => {
  if (!_defaultDb) {
    _defaultDb = createDb();
  }
  return _defaultDb;
};

export const stmtFindByUserName = (db: Database = getDefaultDb()) =>
  db.prepare<{ id: number; username: string; password_hash: string }, [string]>(
    "SELECT id, username, password_hash FROM users WHERE username = ?",
  );

export const stmtInsertUser = (db: Database = getDefaultDb()) =>
  db.prepare<void, [string, string]>(
    "INSERT INTO users (username, password_hash) VALUES (?, ?)",
  );
