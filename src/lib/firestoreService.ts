
'use server';

import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, doc, getDoc, updateDoc, Timestamp, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured, auth } from './firebase'; // auth imported for logging
import type { Session } from '@/components/shared/session-card';
import type { UserRole } from '@/context/role-context';

// Helper function to ensure Firebase is configured and db is available
function ensureFirebaseIsOperational() {
  if (!isFirebaseConfigured()) {
    const errorMessage = "Firebase is not configured. Please add your Firebase config to src/lib/firebase.ts or environment variables.";
    console.error(errorMessage + " Aborting Firestore operation.");
    throw new Error(errorMessage);
  }
  if (!db) {
    const dbErrorMessage = "Firestore DB is not initialized. This can happen if Firebase configuration is missing or incorrect.";
    console.error(dbErrorMessage + " Aborting Firestore operation.");
    throw new Error(dbErrorMessage);
  }
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  createdAt: Timestamp; // Firestore Timestamp
  coachId?: string;
  stripeCustomerId?: string;
}

export interface NewSessionData {
  coachId: string;
  coachName: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  sessionDate: Date;
  sessionType: 'Full' | 'Half';
  videoLink?: string;
  sessionNotes: string;
  summary?: string;
  status: 'Logged' | 'Reviewed' | 'Billed';
}

// --- User Management ---

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  ensureFirebaseIsOperational();
  console.log(`[firestoreService] getUserProfile called for UID: ${uid}. Current auth UID: ${auth.currentUser?.uid}`);
  // if (auth.currentUser) {
  //   console.log(`[firestoreService] Current auth.currentUser.uid in getUserProfile: ${auth.currentUser.uid}`);
  // } else {
  //   console.log(`[firestoreService] No auth.currentUser in getUserProfile when fetching for: ${uid}`);
  // }
  try {
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      // Ensure role is valid or null
      const role = ['admin', 'coach', 'client'].includes(data.role) ? data.role as UserRole : null;
      console.log(`[firestoreService] Profile found for UID ${uid}, role: ${role}`);
      return {
        uid, // ensure uid from doc path is used if it's the primary key, or from data if stored within
        email: data.email,
        displayName: data.displayName,
        role,
        photoURL: data.photoURL,
        createdAt: data.createdAt, // This should be a Firestore Timestamp
        coachId: data.coachId,
        stripeCustomerId: data.stripeCustomerId,
      } as UserProfile;
    }
    console.log(`[firestoreService] No user profile found for UID: ${uid}`);
    return null;
  } catch (error: any) {
    console.error(`[firestoreService] Detailed Firebase Error in getUserProfile for UID ${uid}:`, error);
    let detailedMessage = `Failed to fetch user profile for UID ${uid}.`;
    if (error.code) detailedMessage += ` Firebase Code: ${error.code}.`;
    if (error.message) detailedMessage += ` Original error: ${error.message}.`;
    else detailedMessage += ` An unknown error occurred.`;

    if (error.message && (error.message.includes("Firebase is not configured") || error.message.includes("Firestore DB is not initialized"))) {
      throw error; // Re-throw specific configuration errors
    }
    throw new Error(detailedMessage);
  }
}

// profileData will contain email, displayName, role, and optionally photoURL from the signup form
export async function createUserProfileInFirestore(
  uid: string, // UID from Firebase Auth
  profileData: Omit<UserProfile, 'uid' | 'createdAt'> & {createdAt?: any} // Contains email, displayName, role, photoURL?
): Promise<void> {
  ensureFirebaseIsOperational();
  try {
    const userDocRef = doc(db, 'users', uid);

    // Explicitly construct the object to be written to Firestore
    // This ensures that the `uid` field in the document data is the one from Firebase Auth
    const dataToSet: UserProfile = {
      uid: uid, // This is request.auth.uid in security rules context
      email: profileData.email,
      displayName: profileData.displayName,
      role: profileData.role,
      photoURL: profileData.photoURL || undefined, // Set to undefined if not provided
      createdAt: serverTimestamp() as Timestamp, // Firestore server timestamp
      // coachId and stripeCustomerId will be undefined unless explicitly set later
    };

    console.log('[firestoreService] Attempting to create user profile for UID (argument):', uid);
    console.log('[firestoreService] Profile data received (argument):', JSON.stringify(profileData, null, 2));
    console.log('[firestoreService] FINAL dataToSet being written to Firestore:', JSON.stringify(dataToSet, (key, value) => {
      // Crude way to represent serverTimestamp in log, Firestore handles it specially
      if (typeof value === 'object' && value !== null && value.constructor && value.constructor.name === 'TimestampFieldValue') {
        return '(ServerTimestamp)';
      }
      return value;
    }, 2));


    if (auth.currentUser) {
        console.log('[firestoreService] Current Firebase Auth user (client-side) before setDoc:', auth.currentUser.uid, auth.currentUser.email, 'Display Name:', auth.currentUser.displayName);
        if (auth.currentUser.uid !== uid) {
            console.warn(`[firestoreService] MISMATCH! auth.currentUser.uid (${auth.currentUser.uid}) is different from uid argument (${uid}) for createUserProfileInFirestore.`);
        }
    } else {
        console.warn('[firestoreService] auth.currentUser is null unexpectedly before setDoc. This is highly unusual if called after signup success.');
    }

    await setDoc(userDocRef, dataToSet);
    console.log(`[firestoreService] User profile created/updated in Firestore for UID: ${uid}`);
  } catch (error: any) {
    console.error(`[firestoreService] Detailed Firebase Error in createUserProfileInFirestore for UID ${uid}:`, error);
    let detailedMessage = `Failed to create/update user profile in Firestore for UID ${uid}.`;
    if (error.code) detailedMessage += ` Firebase Code: ${error.code}.`;
    if (error.message) detailedMessage += ` Original error: ${error.message}.`;
    else detailedMessage += ` An unknown error occurred.`;

    if (error.message && (error.message.includes("Firebase is not configured") || error.message.includes("Firestore DB is not initialized"))) {
      throw error;
    }
    throw new Error(detailedMessage);
  }
}

// --- Session Management ---

export async function getClientSessions(clientId: string): Promise<Session[]> {
  ensureFirebaseIsOperational();
  try {
    const sessionsCol = collection(db, 'sessions');
    const q = query(
      sessionsCol,
      where('clientId', '==', clientId),
      orderBy('sessionDate', 'desc')
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        console.log(`No sessions found for client ID: ${clientId}`);
        return [];
    }
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        sessionDate: (data.sessionDate as Timestamp).toDate().toISOString(),
      } as Session;
    });
  } catch (error: any) {
    console.error(`Detailed Firebase Error in getClientSessions for clientID ${clientId}:`, error);
    const baseMessage = `Failed to fetch client sessions for client ID ${clientId}.`;
    let detailedMessage = baseMessage;
    if (error.code) detailedMessage += ` Firebase Code: ${error.code}.`;
    if (error.message) detailedMessage += ` Original error: ${error.message}.`;
    else detailedMessage += ` An unknown error occurred.`;

    if (error.message && (error.message.includes("Firebase is not configured") || error.message.includes("Firestore DB is not initialized"))) {
      throw error;
    }
    throw new Error(detailedMessage);
  }
}

export async function getCoachSessions(coachId: string): Promise<Session[]> {
  ensureFirebaseIsOperational();
  try {
    const sessionsCol = collection(db, 'sessions');
    const q = query(
      sessionsCol,
      where('coachId', '==', coachId),
      orderBy('sessionDate', 'desc')
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        console.log(`No sessions found for coach ID: ${coachId}`);
        return [];
    }
    return snapshot.docs.map(docData => {
      const data = docData.data();
      return {
        id: docData.id,
        ...data,
        sessionDate: (data.sessionDate as Timestamp).toDate().toISOString(),
      } as Session;
    });
  } catch (error: any) {
    console.error(`Detailed Firebase Error in getCoachSessions for coachID ${coachId}:`, error);
    const baseMessage = `Failed to fetch coach sessions for coach ID ${coachId}.`;
    let detailedMessage = baseMessage;
    if (error.code) detailedMessage += ` Firebase Code: ${error.code}.`;
    if (error.message) detailedMessage += ` Original error: ${error.message}.`;
    else detailedMessage += ` An unknown error occurred.`;

    if (error.message && (error.message.includes("Firebase is not configured") || error.message.includes("Firestore DB is not initialized"))) {
      throw error;
    }
    throw new Error(detailedMessage);
  }
}

export async function logSession(sessionData: NewSessionData): Promise<string> {
  ensureFirebaseIsOperational();
  try {
    const sessionsCol = collection(db, 'sessions');
    const docRef = await addDoc(sessionsCol, {
      ...sessionData,
      sessionDate: Timestamp.fromDate(new Date(sessionData.sessionDate)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log(`Session logged with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error: any)
 {
    console.error(`Detailed Firebase Error in logSession:`, error);
    const baseMessage = `Failed to log session.`;
    let detailedMessage = baseMessage;
    if (error.code) detailedMessage += ` Firebase Code: ${error.code}.`;
    if (error.message) detailedMessage += ` Original error: ${error.message}.`;
    else detailedMessage += ` An unknown error occurred.`;

    if (error.message && (error.message.includes("Firebase is not configured") || error.message.includes("Firestore DB is not initialized"))) {
      throw error;
    }
    throw new Error(detailedMessage);
  }
}

export async function getSessionById(sessionId: string): Promise<Session | null> {
  ensureFirebaseIsOperational();
  try {
    const sessionDocRef = doc(db, 'sessions', sessionId);
    const sessionSnap = await getDoc(sessionDocRef);
    if (sessionSnap.exists()) {
      const data = sessionSnap.data();
      return {
        id: sessionSnap.id,
        ...data,
        sessionDate: (data.sessionDate as Timestamp).toDate().toISOString(),
      } as Session;
    }
    console.log(`No session found with ID: ${sessionId}`);
    return null;
  } catch (error: any) {
    console.error(`Detailed Firebase Error in getSessionById for sessionID ${sessionId}:`, error);
    const baseMessage = `Failed to fetch session by ID ${sessionId}.`;
    let detailedMessage = baseMessage;
    if (error.code) detailedMessage += ` Firebase Code: ${error.code}.`;
    if (error.message) detailedMessage += ` Original error: ${error.message}.`;
    else detailedMessage += ` An unknown error occurred.`;

    if (error.message && (error.message.includes("Firebase is not configured") || error.message.includes("Firestore DB is not initialized"))) {
      throw error;
    }
    throw new Error(detailedMessage);
  }
}

export async function updateSession(sessionId: string, updates: Partial<Omit<Session, 'id' | 'sessionDate'> & { sessionDate?: string | Date }>): Promise<void> {
  ensureFirebaseIsOperational();
  try {
    const sessionDocRef = doc(db, 'sessions', sessionId);
    const updateData: any = { ...updates, updatedAt: serverTimestamp() };

    if (updates.sessionDate) {
      updateData.sessionDate = Timestamp.fromDate(new Date(updates.sessionDate));
    }

    await updateDoc(sessionDocRef, updateData);
    console.log(`Session updated: ${sessionId}`);
  } catch (error: any) {
    console.error(`Detailed Firebase Error in updateSession for sessionID ${sessionId}:`, error);
    const baseMessage = `Failed to update session ${sessionId}.`;
    let detailedMessage = baseMessage;
    if (error.code) detailedMessage += ` Firebase Code: ${error.code}.`;
    if (error.message) detailedMessage += ` Original error: ${error.message}.`;
    else detailedMessage += ` An unknown error occurred.`;

    if (error.message && (error.message.includes("Firebase is not configured") || error.message.includes("Firestore DB is not initialized"))) {
      throw error;
    }
    throw new Error(detailedMessage);
  }
}

export async function getAllSessionsForAdmin(): Promise<Session[]> {
  ensureFirebaseIsOperational();
  try {
    const sessionsCol = collection(db, 'sessions');
    const q = query(sessionsCol, orderBy('sessionDate', 'desc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.log("No sessions found for admin.");
      return [];
    }
    return snapshot.docs.map(docData => {
      const data = docData.data();
      return {
        id: docData.id,
        ...data,
        sessionDate: (data.sessionDate as Timestamp).toDate().toISOString(),
      } as Session;
    });
  } catch (error: any) {
    console.error(`Detailed Firebase Error in getAllSessionsForAdmin:`, error);
    const baseMessage = `Failed to fetch all sessions for admin.`;
    let detailedMessage = baseMessage;
    if (error.code) detailedMessage += ` Firebase Code: ${error.code}.`;
    if (error.message) detailedMessage += ` Original error: ${error.message}.`;
    else detailedMessage += ` An unknown error occurred.`;

    if (error.message && (error.message.includes("Firebase is not configured") || error.message.includes("Firestore DB is not initialized"))) {
      throw error;
    }
    throw new Error(detailedMessage);
  }
}

    