
// Ensure you have firebase installed: npm install firebase
// Replace with your actual Firebase project configuration in your .env.local or directly here if not sensitive.
// For this example, we assume you'll replace placeholders manually for now.

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
// import { getAnalytics, type Analytics } from "firebase/analytics"; // Optional

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBhe_SSyUTFo5Qvx3wUE6Hxo9GDMVPGcAw",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "sessionsync-wbo8u.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sessionsync-wbo8u",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "sessionsync-wbo8u.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "919307914288",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:919307914288:web:3d762e6dd81242d0ec71f5",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "YOUR_MEASUREMENT_ID" // Optional, G-XXXXXXXXXX
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
// let analytics: Analytics | undefined; // Optional

if (getApps().length === 0) {
  // Check if the configuration still contains generic placeholders (relevant if env vars are also missing)
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY" || firebaseConfig.apiKey === "AIzaSyBhe_SSyUTFo5Qvx3wUE6Hxo9GDMVPGcAw" && process.env.NEXT_PUBLIC_FIREBASE_API_KEY === undefined) {
    // This warning is more nuanced now. It should only fire if the defaults are still generic placeholders.
    // If the defaults ARE the user's actual keys, this warning logic might need adjustment or removal
    // if we consider direct hardcoding of actual keys as "configured".
    // For now, if apiKey matches the new default AND the env var is not set, it means we are using the hardcoded user key.
    // The original warning compared against "YOUR_API_KEY".
    // A more accurate warning for unconfigured state if even hardcoded values were placeholders:
    if (firebaseConfig.apiKey === "YOUR_API_KEY_PLACEHOLDER_IF_IT_WAS_DIFFERENT") { // This logic branch is simplified
         console.warn(
            "Firebase is not configured. Please add your Firebase config to src/lib/firebase.ts or environment variables."
         );
    }
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  // if (typeof window !== 'undefined' && firebaseConfig.measurementId && firebaseConfig.measurementId !== "YOUR_MEASUREMENT_ID") {
  //   analytics = getAnalytics(app);
  // }
} else {
  app = getApps()[0]!;
  auth = getAuth(app);
  db = getFirestore(app);
  // if (typeof window !== 'undefined' && firebaseConfig.measurementId && firebaseConfig.measurementId !== "YOUR_MEASUREMENT_ID") {
  //    const existingAnalytics = getApps().find(app => getAnalytics(app)); // This line might cause issues if getAnalytics isn't initialized on all apps
  //    if (existingAnalytics) analytics = getAnalytics(existingAnalytics);
  //    else analytics = getAnalytics(app);
  // }
}

export { app, auth, db };
// export { app, auth, db, analytics }; // If using analytics

// Helper function to check if Firebase is meaningfully configured
// It checks if the primary identifiers are different from the initial generic placeholders.
export const isFirebaseConfigured = () => {
  const usingActualApiKey = firebaseConfig.apiKey !== "YOUR_API_KEY" && (process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== undefined || firebaseConfig.apiKey !== "AIzaSyBhe_SSyUTFo5Qvx3wUE6Hxo9GDMVPGcAw" || firebaseConfig.apiKey.startsWith("AIzaSy"));
  const usingActualProjectId = firebaseConfig.projectId !== "YOUR_PROJECT_ID" && (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== undefined || firebaseConfig.projectId !== "sessionsync-wbo8u" || firebaseConfig.projectId.length > 0);
  
  // A simpler check now that defaults ARE actual values:
  // If API key is present and not the GENERIC placeholder "YOUR_API_KEY"
  // And Project ID is present and not the GENERIC placeholder "YOUR_PROJECT_ID"
  // This means either env vars are used, or the new specific defaults are used.
  return firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.projectId !== "YOUR_PROJECT_ID";
};

