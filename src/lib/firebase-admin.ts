import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: any = null;
let adminDb: any = null;

export function initializeFirebaseAdmin() {
  if (adminApp) {
    return { adminApp, adminDb };
  }

  try {
    // Check if already initialized
    if (getApps().length > 0) {
      adminApp = getApps()[0];
    } else {
      // Initialize with service account credentials
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      
      if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
        throw new Error('Missing Firebase Admin SDK environment variables');
      }

      const serviceAccount: ServiceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      };

      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }

    adminDb = getFirestore(adminApp);
    
    return { adminApp, adminDb };
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw new Error('Firebase Admin SDK initialization failed');
  }
}

export function getAdminDb() {
  if (!adminDb) {
    const { adminDb: db } = initializeFirebaseAdmin();
    return db;
  }
  return adminDb;
}