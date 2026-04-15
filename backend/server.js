require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const { initFirebase } = require('./firebase');

const authRoutes      = require('./routes/auth');
const enquiryRoutes   = require('./routes/enquiries');
const admissionRoutes = require('./routes/admissions');

// ── Init Firebase ──────────────────────────────────────────
initFirebase();

const app = express();

// ── Security headers ───────────────────────────────────────
app.use(helmet());

// ── CORS ───────────────────────────────────────────────────
const allowedOrigins = [
  'https://thescholarsacademy.in',
  'https://www.thescholarsacademy.in',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
];

app.use(cors({
  origin(origin, cb) {
    // Allow requests with no origin (Postman, curl, Render health checks)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
  methods : ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parser ────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ─────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/enquiries',  enquiryRoutes);
app.use('/api/admissions', admissionRoutes);

// ── Health check ───────────────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'TSA Backend', ts: new Date().toISOString() })
);

// ── 404 ────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global error handler ───────────────────────────────────
app.use((err, req, res, next) => {   // eslint-disable-line no-unused-vars
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Listen ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 TSA Backend running on port ${PORT}`));
