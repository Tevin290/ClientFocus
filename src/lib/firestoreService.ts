
'use server';

import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, doc, getDoc, updateDoc, Timestamp, setDoc, type FieldValue } from 'firebase/firestore';
import { db, isFirebaseConfigured, auth } from './firebase'; // auth is imported here
import type { Session } from '@/components/shared/session-card';
import type { UserRole } from '@/context/role-context';

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
  createdAt: Timestamp; 
  coachId?: string;
  stripeCustomerId?: string;
}

export type MinimalProfileDataForCreation = {
  email: string;
  displayName: string;
  role: UserRole;
  // photoURL and other optional fields are intentionally omitted here
  // to ensure only minimal data from the signup form is passed.
};


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

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  ensureFirebaseIsOperational();
  console.log(`[firestoreService] getUserProfile called for UID: ${uid}. Path: users/${uid}`);

  try {
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      const role = ['admin', 'coach', 'client'].includes(data.role) ? data.role as UserRole : null;
      
      const profile: UserProfile = {
        uid,
        email: data.email,
        displayName: data.displayName,
        role,
        photoURL: data.photoURL || null,
        createdAt: data.createdAt, 
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
  profileData: MinimalProfileDataForCreation // Use the more specific type
): Promise<void> {
  ensureFirebaseIsOperational();
  console.log(`[firestoreService] createUserProfileInFirestore called with UID argument: ${uid}`);
  console.log(`[firestoreService] createUserProfileInFirestore received profileData (from signup form):`, JSON.stringify(profileData, null, 2));

  try {
    const userDocRef = doc(db, 'users', uid);
    console.log(`[firestoreService] Document reference for new user: users/${uid}`);

    // Construct the minimal, explicit object to be written to Firestore.
    // This ensures only required fields and the passed uid are included.
    const dataForFirestore: {
      uid: string; // Crucial: This field must match request.auth.uid for the simplest rule
      email: string;
      displayName: string;
      role: UserRole;
      createdAt: FieldValue;
      // photoURL, coachId, stripeCustomerId are intentionally omitted from this initial create.
      // They can be added later via an updateProfile function if needed.
    } = {
      uid: uid,
      email: profileData.email,
      displayName: profileData.displayName,
      role: profileData.role,
      createdAt: serverTimestamp(),
    };
    
    console.log(`[firestoreService] UID for document path: users/${uid}`);
    console.log(`[firestoreService] UID from auth argument for data: ${uid}`);
    console.log(`[firestoreService] UID field in dataForFirestore object: ${dataForFirestore.uid}`);
    console.log(`[firestoreService] FINAL dataForFirestore being written (minimal):`, JSON.stringify(dataForFirestore, (key, value) => {
      if (typeof value === 'object' && value !== null && value.constructor && value.constructor.name === 'FieldValue') {
        return '(ServerTimestamp)';
      }
      return value;
    }, 2));

    // Log current auth state from the SDK instance right before setDoc
    if (auth.currentUser) {
        console.log(`[firestoreService] Current auth.currentUser.uid just before setDoc: ${auth.currentUser.uid}`);
        if (auth.currentUser.uid !== uid) {
            console.warn(`[firestoreService] MISMATCH! auth.currentUser.uid (${auth.currentUser.uid}) is different from uid argument (${uid}) for setDoc.`);
        }
    } else {
        console.warn('[firestoreService] auth.currentUser is null just before setDoc. This is unexpected if called after successful signup.');
    }
    
    await setDoc(userDocRef, dataForFirestore);
    console.log(`[firestoreService] User profile (minimal) should be CREATED in Firestore for UID: ${uid}`);

  } catch (error: any) {
    console.error(`[firestoreService] Detailed Firebase Error in createUserProfileInFirestore for UID ${uid}:`, error);
    let detailedMessage = `Failed to create/update user profile in Firestore for UID ${uid}.`;
    if (error.code) detailedMessage += ` Firebase Code: ${error.code}.`;
    if (error.message) {
        detailedMessage += ` Original error: ${error.message}.`;
         if (error.message.includes("Unsupported field value: undefined")) {
            detailedMessage += " This means an optional field was passed as undefined. Check object construction.";
        }
    } else {
        detailedMessage += ` An unknown error occurred.`;
    }

    if (error.message && (error.message.includes("Firebase is not configured") || error.message.includes("Firestore DB is not initialized"))) {
      throw error;
    }
    console.error('[firestoreService] Data that was attempted to be written (and caused error):', JSON.stringify(profileData, null, 2));
    throw new Error(detailedMessage);
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
