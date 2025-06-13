
'use server';

import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, doc, getDoc, updateDoc, Timestamp, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
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
  try {
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      const role = ['admin', 'coach', 'client'].includes(data.role) ? data.role as UserRole : null;
      return {
        uid,
        email: data.email,
        displayName: data.displayName,
        role,
        photoURL: data.photoURL,
        createdAt: data.createdAt,
        coachId: data.coachId,
        stripeCustomerId: data.stripeCustomerId,
      } as UserProfile;
    }
    console.log(`No user profile found for UID: ${uid}`);
    return null;
  } catch (error: any) {
    console.error(`Error fetching user profile for UID ${uid}. Raw Firebase error:`, error);
    if (error instanceof Error) {
      if (error.message.includes("Firebase is not configured") || error.message.includes("Firestore DB is not initialized")) {
        throw error; // Re-throw specific configuration errors
      }
      // For other errors, throw a new error that includes the original message and code if available
      const firebaseErrorCode = (error as any).code || 'N/A';
      throw new Error(`Failed to fetch user profile for UID ${uid}. Firebase code: ${firebaseErrorCode}. Original error: ${error.message}`);
    }
    // Fallback for non-Error objects
    throw new Error(`Failed to fetch user profile for UID ${uid}. An unknown error occurred.`);
  }
}

export async function createUserProfileInFirestore(uid: string, profileData: Omit<UserProfile, 'uid' | 'createdAt'> & {createdAt?: any}): Promise<void> {
  ensureFirebaseIsOperational();
  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      ...profileData,
      uid, // Ensure uid is part of the document data itself
      createdAt: profileData.createdAt || serverTimestamp(), // Use provided createdAt or serverTimestamp
    });
    console.log(`User profile created/updated in Firestore for UID: ${uid}`);
  } catch (error: any) {
    console.error(`Error creating/updating user profile in Firestore for UID ${uid}. Raw Firebase error:`, error);
    if (error instanceof Error) {
        if (error.message.includes("Firebase is not configured") || error.message.includes("Firestore DB is not initialized")) {
            throw error; // Re-throw specific configuration errors
        }
        // For other errors, throw a new error that includes the original message and code if available
        const firebaseErrorCode = (error as any).code || 'N/A';
        throw new Error(`Failed to create/update user profile in Firestore for UID ${uid}. Firebase code: ${firebaseErrorCode}. Original error: ${error.message}`);
    }
    // Fallback for non-Error objects
    throw new Error(`Failed to create/update user profile in Firestore for UID ${uid}. An unknown error occurred.`);
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
    console.error(`Error fetching client sessions for client ID ${clientId}. Raw Firebase error:`, error);
    if (error instanceof Error && (error.message.includes("Firebase is not configured") || error.message.includes("Firestore DB is not initialized"))) {
      throw error;
    }
    const firebaseErrorCode = (error as any).code || 'N/A';
    throw new Error(`Failed to fetch client sessions for client ID ${clientId}. Firebase code: ${firebaseErrorCode}. Original error: ${error.message}`);
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
    console.error(`Error fetching coach sessions for coach ID ${coachId}. Raw Firebase error:`, error);
    if (error instanceof Error && (error.message.includes("Firebase is not configured") || error.message.includes("Firestore DB is not initialized"))) {
      throw error;
    }
    const firebaseErrorCode = (error as any).code || 'N/A';
    throw new Error(`Failed to fetch coach sessions for coach ID ${coachId}. Firebase code: ${firebaseErrorCode}. Original error: ${error.message}`);
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
  } catch (error: any) {
    console.error("Error logging session. Raw Firebase error:", error);
    if (error instanceof Error && (error.message.includes("Firebase is not configured") || error.message.includes("Firestore DB is not initialized"))) {
      throw error;
    }
    const firebaseErrorCode = (error as any).code || 'N/A';
    throw new Error(`Failed to log session. Firebase code: ${firebaseErrorCode}. Original error: ${error.message}`);
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
    console.error(`Error fetching session by ID ${sessionId}. Raw Firebase error:`, error);
     if (error instanceof Error && (error.message.includes("Firebase is not configured") || error.message.includes("Firestore DB is not initialized"))) {
      throw error;
    }
    const firebaseErrorCode = (error as any).code || 'N/A';
    throw new Error(`Failed to fetch session by ID ${sessionId}. Firebase code: ${firebaseErrorCode}. Original error: ${error.message}`);
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
    console.error(`Error updating session ${sessionId}. Raw Firebase error:`, error);
    if (error instanceof Error && (error.message.includes("Firebase is not configured") || error.message.includes("Firestore DB is not initialized"))) {
      throw error;
    }
    const firebaseErrorCode = (error as any).code || 'N/A';
    throw new Error(`Failed to update session ${sessionId}. Firebase code: ${firebaseErrorCode}. Original error: ${error.message}`);
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
    console.error("Error fetching all sessions for admin. Raw Firebase error:", error);
    if (error instanceof Error && (error.message.includes("Firebase is not configured") || error.message.includes("Firestore DB is not initialized"))) {
      throw error;
    }
    const firebaseErrorCode = (error as any).code || 'N/A';
    throw new Error(`Failed to fetch all sessions for admin. Firebase code: ${firebaseErrorCode}. Original error: ${error.message}`);
  }
}


    