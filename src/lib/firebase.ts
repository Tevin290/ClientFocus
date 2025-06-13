
// TODO: Replace with your actual Firebase project configuration
// Ensure you have firebase installed: npm install firebase

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
// import { getAnalytics, type Analytics } from "firebase/analytics"; // Optional

const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Replace with your API key
  authDomain: "YOUR_AUTH_DOMAIN", // Replace with your auth domain
  projectId: "YOUR_PROJECT_ID", // Replace with your project ID
  storageBucket: "YOUR_STORAGE_BUCKET", // Replace with your storage bucket
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Replace with your messaging sender ID
  appId: "YOUR_APP_ID", // Replace with your app ID
  measurementId: "YOUR_MEASUREMENT_ID" // Optional: Replace with your measurement ID for Analytics
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
// let analytics: Analytics | undefined; // Optional

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  // if (typeof window !== 'undefined') { // Initialize Analytics only on client side
  //   analytics = getAnalytics(app);
  // }
} else {
  app = getApps()[0]!;
  auth = getAuth(app);
  db = getFirestore(app);
  // if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  //    const existingAnalytics = getApps().find(app => getAnalytics(app));
  //    if (existingAnalytics) analytics = getAnalytics(existingAnalytics);
  //    else analytics = getAnalytics(app);
  // }
}

export { app, auth, db };
// export { app, auth, db, analytics }; // If using analytics
