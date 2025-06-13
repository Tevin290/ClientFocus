
// Ensure you have firebase installed: npm install firebase
// Replace with your actual Firebase project configuration in your .env.local or directly here if not sensitive.
// For this example, we assume you'll replace placeholders manually for now.

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
// import { getAnalytics, type Analytics } from "firebase/analytics"; // Optional

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "YOUR_MEASUREMENT_ID" // Optional
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
// let analytics: Analytics | undefined; // Optional

if (getApps().length === 0) {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
    console.warn(
      "Firebase is not configured. Please add your Firebase config to src/lib/firebase.ts or environment variables."
    );
    // You might want to throw an error here or handle it gracefully
    // For now, we'll let it proceed, but Firebase services won't work.
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

// Helper function to check if Firebase is configured (client-side)
export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.projectId !== "YOUR_PROJECT_ID";
};
