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

let db;

(async () => {
    db = await initDb();
    console.log('Database initialized');
})();

// API Routes

// Get all builds
app.get('/api/builds', async (req, res) => {
    try {
        const builds = await db.all('SELECT * FROM builds ORDER BY created_at DESC');
        res.json(builds);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new build
app.post('/api/builds', async (req, res) => {
    const { name } = req.body;
    try {
        const result = await db.run('INSERT INTO builds (name) VALUES (?)', [name]);
        const buildId = result.lastID;
        
        // Initialize 14 component slots for the new build
        const componentTypes = [
            'frame', 'wheelset', 'bottom-bracket', 'crank', 
            'front-derailleur', 'rear-derailleur', 'cassette', 'chain',
            'seat', 'seat-post', 'headset', 'stem', 'fork', 'handlebars'
        ];
        
        for (const type of componentTypes) {
            await db.run('INSERT INTO components (build_id, type) VALUES (?, ?)', [buildId, type]);
        }
        
        res.json({ id: buildId, name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get build details with components
app.get('/api/builds/:id', async (req, res) => {
    try {
        const build = await db.get('SELECT * FROM builds WHERE id = ?', [req.params.id]);
        if (!build) return res.status(404).json({ error: 'Build not found' });
        
        const components = await db.all('SELECT * FROM components WHERE build_id = ?', [req.params.id]);
        res.json({ ...build, components });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update a component
app.put('/api/components/:id', upload.single('image'), async (req, res) => {
    const { name, price, description, notes, is_ordered } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.image_url;
    
    try {
        await db.run(
            `UPDATE components SET 
                name = ?, 
                price = ?, 
                description = ?, 
                notes = ?, 
                is_ordered = ?, 
                image_url = ? 
            WHERE id = ?`,
            [name, price, description, notes, is_ordered === 'true' ? 1 : 0, imageUrl, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
