const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { getDb } = require('../firebase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ── POST /api/auth/login ───────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const db  = getDb();
    const snap = await db.collection('admins')
      .where('username', '==', String(username).trim())
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const doc   = snap.docs[0];
    const admin = doc.data();

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: doc.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, expiresIn: 86400, username: admin.username });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── GET /api/auth/verify  (protected) ─────────────────────
router.get('/verify', authMiddleware, (req, res) => {
  res.json({ valid: true, username: req.admin.username });
});

// ── POST /api/auth/setup  (one-time, disabled after first admin) ─
router.post('/setup', async (req, res) => {
  try {
    const db = getDb();
    const existing = await db.collection('admins').limit(1).get();

    if (!existing.empty) {
      return res.status(403).json({ error: 'Admin already configured. Setup is disabled.' });
    }

    const { username, password } = req.body;
    if (!username || !password || password.length < 8) {
      return res.status(400).json({ error: 'Username and password (min 8 chars) are required.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await db.collection('admins').add({
      username: String(username).trim(),
      passwordHash,
      createdAt: new Date().toISOString(),
    });

    res.json({ message: 'Admin account created successfully.' });

  } catch (err) {
    console.error('Setup error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
