/**
 * seed-admin.js
 * ─────────────
 * Run ONCE to create the admin account in Firestore.
 * Credentials are pre-configured – just run:
 *
 *   cd backend
 *   node scripts/seed-admin.js
 *
 * Prerequisites: .env file must exist with valid Firebase credentials.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const admin  = require('firebase-admin');
const bcrypt = require('bcryptjs');

// ── Pre-configured admin credentials ─────────────────────
const ADMIN_USERNAME = '709127';
const ADMIN_PASSWORD = 'Scholars@125';

async function seedAdmin() {
  console.log('🌱 The Scholars Academy – Admin Seeder');
  console.log('──────────────────────────────────────');

  // Validate env
  if (!process.env.FIREBASE_PROJECT_ID) {
    console.error('❌  .env file missing or FIREBASE_PROJECT_ID not set.');
    console.error('    Copy .env.example → .env and fill in your Firebase credentials.');
    process.exit(1);
  }

  // Init Firebase Admin
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId  : process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey : (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });

  const db = admin.firestore();

  // Check if admin already exists
  const existing = await db.collection('admins')
    .where('username', '==', ADMIN_USERNAME)
    .limit(1)
    .get();

  if (!existing.empty) {
    console.log('✅  Admin user already exists. Nothing to do.');
    process.exit(0);
  }

  // Hash the password (10 bcrypt rounds)
  console.log('⏳  Hashing password...');
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // Write to Firestore
  await db.collection('admins').add({
    username    : ADMIN_USERNAME,
    passwordHash,
    createdAt   : new Date().toISOString(),
  });

  console.log('');
  console.log('✅  Admin account created successfully!');
  console.log(`    Username : ${ADMIN_USERNAME}`);
  console.log(`    Password : ${ADMIN_PASSWORD}`);
  console.log('');
  console.log('🔐  Keep these credentials safe. Do not commit .env to git.');
  process.exit(0);
}

seedAdmin().catch(err => {
  console.error('❌  Seeder failed:', err.message);
  process.exit(1);
});
