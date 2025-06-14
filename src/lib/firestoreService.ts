
'use server';

import { collection, serverTimestamp, doc, getDoc, updateDoc, Timestamp, setDoc, type FieldValue, query, where, orderBy, getDocs, addDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured, auth } from './firebase';
import type { Session } from '@/components/shared/session-card';
import type { UserRole } from '@/context/role-context';
import type { User as FirebaseUser } from 'firebase/auth';

function ensureFirebaseIsOperational() {
  if (!isFirebaseConfigured()) {
    const errorMessage = "[firestoreService] Firebase is not configured. Please add your Firebase config to src/lib/firebase.ts or environment variables.";
    console.error(errorMessage + " Aborting Firestore operation.");
    throw new Error(errorMessage);
  }
  if (!db) {
    const dbErrorMessage = "[firestoreService] Firestore DB is not initialized. This can happen if Firebase configuration is missing or incorrect.";
    console.error(dbErrorMessage + " Aborting Firestore operation.");
    throw new Error(dbErrorMessage);
  }
}

export interface UserProfile {
  // uid is the document ID, not a field in the document
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string | null;
  createdAt: Timestamp;
  coachId?: string;
  stripeCustomerId?: string;
  diagnosticMarker?: boolean; // For extreme diagnostics
}

export interface NewSessionData {
  coachId: string;
  coachName:string;
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

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  ensureFirebaseIsOperational();
  console.log(`[firestoreService] getUserProfile called for UID: ${uid}. Path: users/${uid}`);

  try {
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      const role = ['admin', 'coach', 'client'].includes(data.role) ? data.role as UserRole : null;

      let createdAtTimestamp: Timestamp;
      if (data.createdAt instanceof Timestamp) {
        createdAtTimestamp = data.createdAt;
      } else if (data.createdAt && typeof data.createdAt.seconds === 'number' && typeof data.createdAt.nanoseconds === 'number') {
        createdAtTimestamp = new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds);
      } else {
        console.warn(`[firestoreService] createdAt field for UID ${uid} is missing or not a Firestore Timestamp. Using current client time as fallback for UserProfile object.`);
        createdAtTimestamp = Timestamp.now();
      }

      const profile: UserProfile = {
        // uid: userSnap.id, // uid is the doc ID, not stored as a field
        email: data.email,
        displayName: data.displayName,
        role,
        photoURL: data.photoURL || null,
        createdAt: createdAtTimestamp,
        coachId: data.coachId || undefined,
        stripeCustomerId: data.stripeCustomerId || undefined,
        diagnosticMarker: data.diagnosticMarker || undefined,
      };
      console.log(`[firestoreService] User profile successfully fetched for UID ${uid}. Role: ${profile.role}`);
      return profile;
    }
    console.log(`[firestoreService] No user profile found for UID: ${uid}`);
    return null;
  } catch (error: any) {
    console.error(`[firestoreService] Detailed Firebase Error in getUserProfile for UID ${uid}:`, error);
    let detailedMessage = `Failed to fetch user profile for UID ${uid}.`;
    if (error.code) detailedMessage += ` Firebase Code: ${error.code}.`;
    if (error.message) {
        detailedMessage += ` Original error: ${error.message}.`;
    } else {
        detailedMessage += ` An unknown error occurred.`;
    }
    if (error.message && (error.message.includes("Firebase is not configured") || error.message.includes("Firestore DB is not initialized"))) {
      throw error;
    }
    throw new Error(detailedMessage);
  }
}

// EXTREME DIAGNOSTIC VERSION: Only takes firebaseUser, writes MINIMAL HARDCODED data.
export async function createUserProfileInFirestore(
  firebaseUser: FirebaseUser
): Promise<void> {
  ensureFirebaseIsOperational();

  if (!firebaseUser || !firebaseUser.uid) {
    const criticalError = "[firestoreService] Critical Error: firebaseUser object is null or has no UID in createUserProfileInFirestore. Aborting profile creation.";
    console.error(criticalError);
    throw new Error("Invalid user object provided for profile creation.");
  }

  const uid = firebaseUser.uid;
  console.log(`[firestoreService] DIAGNOSTIC createUserProfileInFirestore called with firebaseUser.uid: ${uid}`);

  const userDocRef = doc(db, 'users', uid);
  console.log(`[firestoreService] Document reference for new user: ${userDocRef.path}`);

  // Extremely simplified data for diagnostic purposes
  const dataForFirestore = {
    diagnosticMarker: true,
    createdAt: Timestamp.now(), // Using client-side timestamp for diagnostics
  };

  console.log('[firestoreService] DIAGNOSTIC: Attempting to write EXTREMELY MINIMAL dataForFirestore:', JSON.stringify(dataForFirestore, null, 2));

  try {
    await setDoc(userDocRef, dataForFirestore);
    console.log(`[firestoreService] DIAGNOSTIC: User profile (extremely minimal with diagnosticMarker) should be CREATED in Firestore for UID: ${uid}`);
  } catch (error: any) {
    console.error(`[firestoreService] DIAGNOSTIC: Error during setDoc in createUserProfileInFirestore for UID ${uid}:`, error);
    let detailedMessage = `DIAGNOSTIC: Failed to create/update user profile (extremely minimal with diagnosticMarker) in Firestore for UID ${uid} (during setDoc).`;
     if (error instanceof RangeError && error.message.includes('Maximum call stack size exceeded')) {
        detailedMessage = `DIAGNOSTIC: A "Maximum call stack size exceeded" error occurred during the Firestore setDoc operation for UID ${uid}.`;
        console.error(`[firestoreService] DIAGNOSTIC Confirmed: Stack overflow occurred within or during setDoc call for UID ${uid}.`);
    } else {
        if (error.code) detailedMessage += ` Firebase Code: ${error.code}.`;
        if (error.message) detailedMessage += ` Original error: ${error.message}.`;
        else detailedMessage += ` An unknown error occurred.`;
    }
    // Do not re-throw if it's the specific "Firebase is not configured" or "DB not initialized" errors,
    // as ensureFirebaseIsOperational already threw them.
    if (error.message && (error.message.includes("Firebase is not configured") || error.message.includes("Firestore DB is not initialized"))) {
      // Already handled by ensureFirebaseIsOperational, re-throwing can mask the original more specific error.
    } else {
       throw error; // Re-throw the original error from setDoc or the constructed detailed message if it's not a config error.
    }
  }
}


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

    