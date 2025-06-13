
'use server';

import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc, writeBatch, Timestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Session } from '@/components/shared/session-card';
import type { UserRole } from '@/context/role-context';

export interface UserProfile {
  uid: string;
  email: string; // Made non-null for core functionality
  displayName: string; // Made non-null
  role: UserRole;
  photoURL?: string;
  createdAt: Timestamp; // Firestore Timestamp
  coachId?: string; // For client roles
  stripeCustomerId?: string;
}

export interface NewSessionData {
  coachId: string;
  coachName: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  sessionDate: Date; // JS Date for input, convert to Timestamp for Firestore
  sessionType: 'Full' | 'Half';
  videoLink?: string;
  sessionNotes: string;
  summary?: string;
  status: 'Logged' | 'Reviewed' | 'Billed';
}

// --- User Management ---

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) {
    console.error("Firestore DB is not initialized in getUserProfile.");
    throw new Error("Firestore not available");
  }
  try {
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      // Ensure role is a valid UserRole
      const role = ['admin', 'coach', 'client'].includes(data.role) ? data.role as UserRole : null;
      return { 
        uid, 
        email: data.email,
        displayName: data.displayName,
        role,
        photoURL: data.photoURL,
        createdAt: data.createdAt, // This will be a Firestore Timestamp
        coachId: data.coachId,
        stripeCustomerId: data.stripeCustomerId,
      } as UserProfile;
    }
    console.log(`No user profile found for UID: ${uid}`);
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
}

// Used by dummy data generation, ensure uid is passed and data matches UserProfile structure
export async function createUserProfileInFirestore(uid: string, profileData: Omit<UserProfile, 'uid' | 'createdAt'> & {createdAt?: any}): Promise<void> {
  if (!db) {
    console.error("Firestore DB is not initialized in createUserProfileInFirestore.");
    throw new Error("Firestore not available");
  }
  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      ...profileData,
      uid, // ensure uid is part of the document data
      createdAt: profileData.createdAt || serverTimestamp(),
    });
    console.log(`User profile created/updated in Firestore for UID: ${uid}`);
  } catch (error) {
    console.error("Error creating/updating user profile in Firestore:", error);
    throw error;
  }
}

// --- Session Management ---

export async function getClientSessions(clientId: string): Promise<Session[]> {
  if (!db) {
    console.error("Firestore DB is not initialized in getClientSessions.");
    return []; // Or throw error
  }
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
        sessionDate: (data.sessionDate as Timestamp).toDate().toISOString(), // Convert Timestamp to string
      } as Session;
    });
  } catch (error) {
    console.error("Error fetching client sessions:", error);
    // Return mock data or rethrow, for now, returning empty to avoid breaking UI on error
     return [ /*
        {
          id: 'mock_c1',
          coachName: 'Dr. John Doe (Mock)',
          clientName: 'Current Client (Mock)',
          sessionDate: new Date('2024-07-15').toISOString(),
          sessionType: 'Full',
          summary: 'Client History (Mock): Discussed project milestones.',
          videoLink: 'https://example.com/recording_mock1',
          status: 'Logged',
        }, */
      ];
  }
}

export async function getCoachSessions(coachId: string): Promise<Session[]> {
  if (!db) {
    console.error("Firestore DB is not initialized in getCoachSessions.");
    return [];
  }
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
  } catch (error) {
    console.error("Error fetching coach sessions:", error);
    return []; // Fallback or rethrow
  }
}


export async function logSession(sessionData: NewSessionData): Promise<string> {
   if (!db) {
    console.error("Firestore DB is not initialized in logSession.");
    throw new Error("Firestore not available");
  }
  try {
    const sessionsCol = collection(db, 'sessions');
    const docRef = await addDoc(sessionsCol, {
      ...sessionData,
      sessionDate: Timestamp.fromDate(new Date(sessionData.sessionDate)), // Convert JS Date to Firestore Timestamp
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log(`Session logged with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error("Error logging session:", error);
    throw error;
  }
}

export async function getSessionById(sessionId: string): Promise<Session | null> {
   if (!db) {
    console.error("Firestore DB is not initialized in getSessionById.");
    return null;
  }
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
  } catch (error) {
    console.error("Error fetching session by ID:", error);
    return null; // Or rethrow
  }
}

export async function updateSession(sessionId: string, updates: Partial<Omit<Session, 'id' | 'sessionDate'> & { sessionDate?: string | Date }>): Promise<void> {
   if (!db) {
    console.error("Firestore DB is not initialized in updateSession.");
    throw new Error("Firestore not available");
  }
  try {
    const sessionDocRef = doc(db, 'sessions', sessionId);
    const updateData: any = { ...updates, updatedAt: serverTimestamp() };

    if (updates.sessionDate) {
      updateData.sessionDate = Timestamp.fromDate(new Date(updates.sessionDate));
    }
    
    await updateDoc(sessionDocRef, updateData);
    console.log(`Session updated: ${sessionId}`);
  } catch (error) {
    console.error("Error updating session:", error);
    throw error;
  }
}

export async function getAllSessionsForAdmin(): Promise<Session[]> {
  if (!db) {
    console.error("Firestore DB is not initialized in getAllSessionsForAdmin.");
    return [];
  }
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
  } catch (error) {
    console.error("Error fetching all sessions for admin:", error);
    return [];
  }
}
