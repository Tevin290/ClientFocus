
'use server';

import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, doc, getDoc, updateDoc, Timestamp, setDoc, type FieldValue } from 'firebase/firestore';
import { db, isFirebaseConfigured, auth } from './firebase';
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
  photoURL?: string | null;
  createdAt: Timestamp; // Firestore Timestamp for read
  coachId?: string;
  stripeCustomerId?: string;
}

// Type for the minimal data received from the signup form for profile creation
export type MinimalProfileDataForCreation = Pick<UserProfile, 'email' | 'displayName' | 'role'>;


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
  console.log(`[firestoreService] getUserProfile called for UID: ${uid}.`);
  if (auth.currentUser) {
    console.log(`[firestoreService] Current auth.currentUser.uid in getUserProfile: ${auth.currentUser.uid}`);
  } else {
    console.log(`[firestoreService] No auth.currentUser in getUserProfile when fetching for: ${uid}`);
  }
  try {
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      const role = ['admin', 'coach', 'client'].includes(data.role) ? data.role as UserRole : null;
      console.log(`[firestoreService] Profile found for UID ${uid}, role: ${role}`);
      // Ensure all fields from UserProfile are correctly mapped
      const profile: UserProfile = {
        uid,
        email: data.email,
        displayName: data.displayName,
        role,
        photoURL: data.photoURL || null, // Ensure photoURL is null if not present
        createdAt: data.createdAt, // This should be a Firestore Timestamp
        coachId: data.coachId || undefined,
        stripeCustomerId: data.stripeCustomerId || undefined,
      };
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


export async function createUserProfileInFirestore(
  uid: string,
  profileDataFromSignup: MinimalProfileDataForCreation
): Promise<void> {
  ensureFirebaseIsOperational();
  console.log(`[firestoreService] createUserProfileInFirestore called with UID argument: ${uid}`);
  console.log(`[firestoreService] createUserProfileInFirestore received minimal profileData (from signup form):`, JSON.stringify(profileDataFromSignup, null, 2));

  try {
    const userDocRef = doc(db, 'users', uid);

    // Construct the minimal object to be written to Firestore
    const dataForFirestore: {
      uid: string;
      email: string;
      displayName: string;
      role: UserRole;
      createdAt: FieldValue;
      // photoURL, coachId, stripeCustomerId are intentionally omitted for initial minimal creation
    } = {
      uid: uid, // UID from auth
      email: profileDataFromSignup.email,
      displayName: profileDataFromSignup.displayName,
      role: profileDataFromSignup.role,
      createdAt: serverTimestamp(),
    };

    console.log(`[firestoreService] UID for document path: ${userDocRef.path}`);
    console.log(`[firestoreService] UID from auth argument for data: ${uid}`);
    console.log(`[firestoreService] UID field in dataForFirestore object: ${dataForFirestore.uid}`);
    console.log('[firestoreService] FINAL dataForFirestore being written (minimal):', JSON.stringify(dataForFirestore, (key, value) => {
      if (typeof value === 'object' && value !== null && value.constructor && value.constructor.name === 'FieldValue') {
        return '(ServerTimestamp)';
      }
      return value;
    }, 2));
    
    if (auth.currentUser) {
        console.log(`[firestoreService] Current auth.currentUser.uid just before setDoc: ${auth.currentUser.uid}`);
        if (auth.currentUser.uid !== uid) {
            console.warn(`[firestoreService] MISMATCH! auth.currentUser.uid (${auth.currentUser.uid}) is different from uid argument (${uid}) for createUserProfileInFirestore just before setDoc.`);
        }
    } else {
        console.warn('[firestoreService] auth.currentUser is null unexpectedly before setDoc in createUserProfileInFirestore.');
    }

    await setDoc(userDocRef, dataForFirestore);
    console.log(`[firestoreService] User profile (minimal) CREATED in Firestore for UID: ${uid}`);
  } catch (error: any) {
    console.error(`[firestoreService] Detailed Firebase Error in createUserProfileInFirestore for UID ${uid}:`, error);
    let detailedMessage = `Failed to create/update user profile in Firestore for UID ${uid}.`;
    if (error.code) detailedMessage += ` Firebase Code: ${error.code}.`;
    if (error.message) {
        detailedMessage += ` Original error: ${error.message}.`;
         if (error.message.includes("Unsupported field value: undefined")) {
            detailedMessage += " This means an optional field was passed as undefined instead of being omitted or set to null.";
        }
    } else {
        detailedMessage += ` An unknown error occurred.`;
    }

    if (error.message && (error.message.includes("Firebase is not configured") || error.message.includes("Firestore DB is not initialized"))) {
      throw error;
    }
    console.error('[firestoreService] Data that was attempted to be written (and caused error):', JSON.stringify(profileDataFromSignup, null, 2));
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
