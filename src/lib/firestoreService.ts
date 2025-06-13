
'use server'; // Or remove if you intend to use this on client heavily with client-side SDK

import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase'; // Ensure db is properly initialized and exported from firebase.ts
import type { Session } from '@/components/shared/session-card'; // Assuming Session type is defined here
import type { UserRole } from '@/context/role-context';

// Define a more complete User type based on your Firestore structure
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  photoURL?: string;
  createdAt?: any; // Firestore Timestamp
  coachId?: string;
  stripeCustomerId?: string;
}


// --- User Management ---

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      return { uid, ...userSnap.data() } as UserProfile;
    }
    console.log(`No user profile found for UID: ${uid}`);
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error; // Re-throw or handle as needed
  }
}

export async function createUserProfile(uid: string, data: Omit<UserProfile, 'uid' | 'createdAt'>): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', uid);
    await addDoc(collection(db, 'users'), { // Using addDoc will auto-generate an ID, consider setDoc with uid
      ...data,
      uid, // ensure uid is part of the document data
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
}


// --- Session Management ---

// This is a more specific type for data being sent to Firestore for a new session
export interface NewSessionData {
  coachId: string;
  coachName: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  sessionDate: Date; // Use JS Date for input, convert to Timestamp for Firestore
  sessionType: 'Full' | 'Half';
  videoLink?: string;
  sessionNotes: string;
  summary?: string;
  status: 'Logged' | 'Reviewed' | 'Billed';
}


export async function getClientSessions(clientId: string): Promise<Session[]> {
  // This is a placeholder. In a real app, you'd fetch this from Firestore.
  console.log(`Fetching sessions for client ID (placeholder): ${clientId}`);
  // Example Firestore query (uncomment and adapt when Firebase is fully set up)
  /*
  try {
    const sessionsCol = collection(db, 'sessions');
    const q = query(
      sessionsCol,
      where('clientId', '==', clientId),
      orderBy('sessionDate', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      sessionDate: doc.data().sessionDate.toDate().toISOString(), // Convert Timestamp to string
    })) as Session[];
  } catch (error) {
    console.error("Error fetching client sessions:", error);
    return [];
  }
  */

  // Mock data as before:
  const mockClientSessions: Session[] = [
    {
      id: 'c1',
      coachName: 'Dr. John Doe',
      sessionDate: '2024-07-15',
      sessionType: 'Full',
      summary: 'Client History: Discussed project milestones and brainstormed strategies. Key actions: A, B, C.',
      videoLink: 'https://example.com/recording1',
    },
    {
      id: 'c2',
      coachName: 'Jane Smith',
      sessionDate: '2024-06-20',
      sessionType: 'Half',
      summary: 'Client History: Quick check-in on time management. Reviewed weekly planner.',
    },
  ];
  return Promise.resolve(mockClientSessions.map(s => ({...s, clientName: 'Current Client'})));
}


export async function getCoachSessions(coachId: string): Promise<Session[]> {
  console.log(`Fetching sessions for coach ID (placeholder): ${coachId}`);
  // Example Firestore query (uncomment and adapt)
  /*
  try {
    const sessionsCol = collection(db, 'sessions');
    const q = query(
      sessionsCol,
      where('coachId', '==', coachId),
      orderBy('sessionDate', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      sessionDate: doc.data().sessionDate.toDate().toISOString(),
    })) as Session[];
  } catch (error) {
    console.error("Error fetching coach sessions:", error);
    return [];
  }
  */
  // Mock data:
  const mockCoachSessions: Array<Session & { clientId: string }> = [
    {
      id: 'coach_s1',
      clientId: 'client_1',
      clientName: 'Alice Wonderland',
      sessionDate: '2024-07-20',
      sessionType: 'Full',
      summary: 'Focused on goal setting and weekly planning. Alice is making good progress.',
      videoLink: 'https://example.com/recording_coach_alice',
      status: 'Logged',
    },
  ];
  return Promise.resolve(mockCoachSessions);
}

export async function logSession(sessionData: NewSessionData): Promise<string> {
  console.log('Logging session (placeholder):', sessionData);
  // Example Firestore add (uncomment and adapt)
  /*
  try {
    const sessionsCol = collection(db, 'sessions');
    const docRef = await addDoc(sessionsCol, {
      ...sessionData,
      sessionDate: sessionData.sessionDate, // Firestore will convert JS Date to Timestamp
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error logging session:", error);
    throw error;
  }
  */
  return Promise.resolve(`mock_session_id_${Date.now()}`); // Return a mock ID
}

export async function getSessionById(sessionId: string): Promise<Session | null> {
  console.log(`Fetching session by ID (placeholder): ${sessionId}`);
  // Example Firestore query (uncomment and adapt)
  /*
  try {
    const sessionDocRef = doc(db, 'sessions', sessionId);
    const sessionSnap = await getDoc(sessionDocRef);
    if (sessionSnap.exists()) {
      return {
        id: sessionSnap.id,
        ...sessionSnap.data(),
        sessionDate: sessionSnap.data().sessionDate.toDate().toISOString(),
      } as Session;
    }
    return null;
  } catch (error) {
    console.error("Error fetching session by ID:", error);
    return null;
  }
  */
  return Promise.resolve(null);
}

export async function updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
  console.log(`Updating session (placeholder) ${sessionId}:`, updates);
  // Example Firestore update (uncomment and adapt)
  /*
  try {
    const sessionDocRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionDocRef, {
      ...updates,
      sessionDate: updates.sessionDate ? new Date(updates.sessionDate) : undefined, // Convert back to Date if updating
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating session:", error);
    throw error;
  }
  */
  return Promise.resolve();
}
