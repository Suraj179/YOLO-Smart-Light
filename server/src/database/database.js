
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Store the database outside src so it persists
// when we modify the application code.
const dataDirectory = path.join(__dirname, "../../data");

// Create the data directory if it does not exist.
fs.mkdirSync(dataDirectory, { recursive: true });

// Open the SQLite database file.
const databasePath = path.join(dataDirectory, "smartlight.db");
const db = new Database(databasePath);

// Configure SQLite.
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create the users table if it does not exist.
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL COLLATE NOCASE UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (
            strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        )
    );
`);

console.log("SQLite database initialized.");
console.log(`Database location: ${databasePath}`);

module.exports = db;
