const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function initDb() {
    const db = await open({
        filename: path.join(__dirname, '..', 'database.sqlite'),
        driver: sqlite3.Database
    });

    await db.exec(`
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
