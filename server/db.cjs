const Database = require('better-sqlite3');
const path = require('path');

function initDb() {
    const db = new Database(path.join(__dirname, '..', 'database.sqlite'));

    db.exec(`
        CREATE TABLE IF NOT EXISTS builds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS components (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            build_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            name TEXT,
            image_url TEXT,
            price REAL,
            description TEXT,
            notes TEXT,
            is_ordered BOOLEAN DEFAULT 0,
            FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE CASCADE
        );
    `);

    return db;
}

module.exports = { initDb };
