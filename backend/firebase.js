const admin = require('firebase-admin');

let _initialized = false;

/**
 * Call once at app startup. Reads credentials from environment variables
 * so the private key never lives in source code.
 */
function initFirebase() {
  if (_initialized) return;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId  : process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Render stores the key as a single line with literal \n – we restore them
      privateKey : (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });

  _initialized = true;
  console.log('✅ Firebase Admin SDK initialized');
}

/**
 * Returns the Firestore instance. Must call initFirebase() first.
 */
function getDb() {
  return admin.firestore();
}

module.exports = { initFirebase, getDb };
