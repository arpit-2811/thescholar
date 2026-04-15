const admin = require('firebase-admin');

let _initialized = false;

/**
 * Call once at app startup. Reads credentials from environment variables
 * so the private key never lives in source code.
 */
// Bulletproof private key formatter
function formatPrivateKey(key) {
  if (!key) return '';
  // 1. Remove surrounding double quotes if present
  let formatted = key.replace(/^"|"$/g, '');
  // 2. Replace literal '\n' characters with actual newlines
  formatted = formatted.replace(/\\n/g, '\n');
  // 3. If newlines were collapsed into spaces by Render (except for spaces in the header/footer)
  if (!formatted.includes('\n')) {
    formatted = formatted
      .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
      .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----')
      .replace(/ /g, (match, offset, str) => {
        // Only replace spaces that are in the Base64 section
        if (offset > 27 && offset < str.length - 25) return '\n';
        return match;
      });
  }
  return formatted;
}

function initFirebase() {
  if (_initialized) return;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId  : process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey : formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
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
