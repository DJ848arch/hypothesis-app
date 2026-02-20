// Firebase admin config for server-side (API)
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let serviceAccount: any = {};
let initError: Error | null = null;

try {
  const keyString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!keyString) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
  }
  serviceAccount = JSON.parse(keyString);
  
  // Validate required fields
  const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
  const missingFields = requiredFields.filter(field => !serviceAccount[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Service account is missing required fields: ${missingFields.join(', ')}`);
  }
} catch (error: any) {
  console.warn('⚠️  Firebase Admin SDK configuration warning:', error.message);
  initError = error;
}

let db: any;
let auth: any;

try {
  const app = getApps().length ? getApps()[0] : initializeApp({
    credential: cert(serviceAccount),
  });

  db = getFirestore(app);
  auth = getAuth(app);
} catch (error: any) {
  console.warn('⚠️  Firebase Admin SDK initialization warning:', error.message);
}

export { db, auth };
