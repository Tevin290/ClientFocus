
// Ensure you have firebase installed: npm install firebase
// Replace with your actual Firebase project configuration in your .env.local or directly here if not sensitive.
// For this example, we assume you'll replace placeholders manually for now.

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
// import { getAnalytics, type Analytics } from "firebase/analytics"; // Optional

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "YOUR_MEASUREMENT_ID" // Optional, G-XXXXXXXXXX
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
// let analytics: Analytics | undefined; // Optional

if (getApps().length === 0) {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY" || firebaseConfig.apiKey === "AIzaSyBhe_SSyUTFo5Qvx3wUE6Hxo9GDMVPGcAw" && process.env.NEXT_PUBLIC_FIREBASE_API_KEY === undefined) {
    if (firebaseConfig.apiKey === "YOUR_API_KEY_PLACEHOLDER_IF_IT_WAS_DIFFERENT") { 
         console.warn(
            "Firebase is not configured. Please add your Firebase config to src/lib/firebase.ts or environment variables."
         );
    }
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  // Set auth persistence to session-only
  setPersistence(auth, browserSessionPersistence)
    .catch((error) => {
      console.error("Firebase Auth: Error setting persistence to session-only.", error);
    });

  // if (typeof window !== 'undefined' && firebaseConfig.measurementId && firebaseConfig.measurementId !== "YOUR_MEASUREMENT_ID") {
  //   analytics = getAnalytics(app);
  // }
} else {
  app = getApps()[0]!;
  auth = getAuth(app); 
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage };
// export { app, auth, db, analytics }; // If using analytics

export const isFirebaseConfigured = () => {
  const isDefaultKey = firebaseConfig.apiKey?.startsWith('AIza');
  return !isDefaultKey && firebaseConfig.projectId !== "YOUR_PROJECT_ID";
};
