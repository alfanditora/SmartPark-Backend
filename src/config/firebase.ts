import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

let serviceAccount: any;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccountPath = path.resolve(
      process.cwd(),
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    );
    serviceAccount = require(serviceAccountPath);
  } else {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is not defined in .env');
  }
} catch (e) {
  console.error('Error parsing Firebase service account:', e);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

export { admin, db, auth };
