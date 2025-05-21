import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let serviceAccount: any;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not defined in .env');
  }
} catch (e) {
  console.error('Error parsing Firebase service account JSON from environment variable:', e);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

export { admin, db, auth };
