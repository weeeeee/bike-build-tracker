const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { initDb } = require('./db.cjs');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

const db = initDb();
console.log('Database initialized');

// API Routes

// Get all builds
app.get('/api/builds', (req, res) => {
    try {
        const builds = db.prepare('SELECT * FROM builds ORDER BY created_at DESC').all();
        res.json(builds);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new build
app.post('/api/builds', (req, res) => {
    const { name } = req.body;
    try {
        const info = db.prepare('INSERT INTO builds (name) VALUES (?)').run(name);
        const buildId = info.lastInsertRowid;
        
        // Initialize 14 component slots
        const componentTypes = [
            'frame', 'wheelset', 'bottom-bracket', 'crank', 
            'front-derailleur', 'rear-derailleur', 'cassette', 'chain',
            'seat', 'seat-post', 'headset', 'stem', 'fork', 'handlebars'
        ];
        
        const stmt = db.prepare('INSERT INTO components (build_id, type) VALUES (?, ?)');
        for (const type of componentTypes) {
            stmt.run(buildId, type);
        }
        
        res.json({ id: buildId, name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get build details
app.get('/api/builds/:id', (req, res) => {
    try {
        const build = db.prepare('SELECT * FROM builds WHERE id = ?').get(req.params.id);
        if (!build) return res.status(404).json({ error: 'Build not found' });
        
        const components = db.prepare('SELECT * FROM components WHERE build_id = ?').all(req.params.id);
        res.json({ ...build, components });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update a component
app.put('/api/components/:id', upload.single('image'), (req, res) => {
    const { name, price, description, notes, is_ordered } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.image_url;
    
    try {
        db.prepare(`
            UPDATE components SET 
                name = ?, 
                price = ?, 
                description = ?, 
                notes = ?, 
                is_ordered = ?, 
                image_url = ? 
            WHERE id = ?
        `).run(
            name, 
            price, 
            description, 
            notes, 
            is_ordered === 'true' ? 1 : 0, 
            imageUrl, 
            req.params.id
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
