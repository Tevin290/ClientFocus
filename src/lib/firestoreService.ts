
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
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string | null;
  createdAt: Timestamp | FieldValue; // Allow for FieldValue on create
  updatedAt?: Timestamp | FieldValue;
  coachId?: string;
  stripeCustomerId?: string;
}

export interface NewSessionData {
  coachId: string;
  coachName:string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  sessionDate: Date;
  sessionType: 'Full' | 'Half';
  videoLink?: string | '';
  sessionNotes: string;
  summary?: string | '';
  status: 'Under Review' | 'Approved' | 'Denied' | 'Billed';
}

export async function createUserProfileInFirestore(
  uid: string,
  profileData: Omit<UserProfile, 'uid' | 'createdAt'> & { createdAt?: FieldValue | Timestamp }
): Promise<void> {
  ensureFirebaseIsOperational();
  const userDocRef = doc(db, 'users', uid);
  try {
    await setDoc(userDocRef, { 
      ...profileData, 
      uid, 
      createdAt: profileData.createdAt || serverTimestamp() 
    });
  } catch (error) {
    console.error(`Error writing user profile to Firestore for UID ${uid}:`, error);
    throw error;
  }
}


export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  ensureFirebaseIsOperational();
  try {
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      const role = ['admin', 'super-admin', 'coach', 'client'].includes(data.role) ? data.role as UserRole : null;

      let createdAtTimestamp: Timestamp;
      if (data.createdAt instanceof Timestamp) {
        createdAtTimestamp = data.createdAt;
      } else if (data.createdAt && typeof data.createdAt.seconds === 'number') {
        createdAtTimestamp = new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds);
      } else {
        createdAtTimestamp = Timestamp.now();
      }

      const profile: UserProfile = {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        role,
        photoURL: data.photoURL || null,
        createdAt: createdAtTimestamp,
        coachId: data.coachId || undefined,
        stripeCustomerId: data.stripeCustomerId || undefined,
      };
      return profile;
    }
    return null;
  } catch (error: any) {
    console.error(`[firestoreService] Detailed Firebase Error in getUserProfile for UID ${uid}:`, error);
    let detailedMessage = `Failed to fetch user profile for UID ${uid}.`;
    if (error.code) detailedMessage += ` Firebase Code: ${error.code}.`;
    if (error.message) detailedMessage += ` Original error: ${error.message}.`;
    throw new Error(detailedMessage);
  }
}


export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    ensureFirebaseIsOperational();
    try {
        const userDocRef = doc(db, 'users', uid);
        const updateData = { ...updates, updatedAt: serverTimestamp() };
        await updateDoc(userDocRef, updateData);
    } catch (error: any) {
        console.error(`Detailed Firebase Error in updateUserProfile for UID ${uid}:`, error);
        throw new Error(`Failed to update user profile for UID ${uid}.`);
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
    throw new Error(`Failed to fetch client sessions for client ID ${clientId}. See server logs for details.`);
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
    throw new Error(`Failed to fetch coach sessions for coach ID ${coachId}. See server logs for details.`);
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
  } catch (error: any) {
    console.error(`Detailed Firebase Error in logSession:`, error);
    throw new Error(`Failed to log session. See server logs for details.`);
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
    throw new Error(`Failed to fetch session by ID ${sessionId}. See server logs for details.`);
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
    throw new Error(`Failed to update session ${sessionId}. See server logs for details.`);
  }
}

export async function getAllSessionsForAdmin(role: UserRole): Promise<Session[]> {
  ensureFirebaseIsOperational();
  try {
    const sessionsCol = collection(db, 'sessions');
    let q;

    if (role === 'admin') {
      // Admin sees sessions that are 'Under Review' to approve/deny
      q = query(sessionsCol, where('status', '==', 'Under Review'), orderBy('sessionDate', 'desc'));
    } else if (role === 'super-admin') {
      // Super Admin sees 'Approved' sessions to bill them
      q = query(sessionsCol, where('status', '==', 'Approved'), orderBy('sessionDate', 'desc'));
    } else {
      console.warn(`getAllSessionsForAdmin called with an invalid role: ${role}`);
      return [];
    }

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
     if (error.code === 'failed-precondition') {
      throw new Error(`Failed to fetch sessions for review. A Firestore index is required. Please check the browser's developer console for a link to create it.`);
    }
    throw new Error(`Failed to fetch all sessions for admin. See server logs for details.`);
  }
}

export async function getAllCoaches(): Promise<UserProfile[]> {
  ensureFirebaseIsOperational();
  try {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('role', '==', 'coach'), orderBy('displayName', 'asc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => {
      const data = doc.data();
      let createdAtTimestamp: Timestamp;
      if (data.createdAt instanceof Timestamp) {
        createdAtTimestamp = data.createdAt;
      } else if (data.createdAt && typeof data.createdAt.seconds === 'number') {
        createdAtTimestamp = new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds);
      } else {
        createdAtTimestamp = Timestamp.now();
      }
      return {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        role: 'coach',
        photoURL: data.photoURL || null,
        createdAt: createdAtTimestamp,
      } as UserProfile;
    });
  } catch (error: any) {
    console.error(`Detailed Firebase Error in getAllCoaches:`, error);
    throw new Error(`Failed to fetch coaches. See server logs for details.`);
  }
}

export async function getCoachClients(coachId: string): Promise<UserProfile[]> {
  ensureFirebaseIsOperational();
  try {
    const usersCol = collection(db, 'users');
    const q = query(
      usersCol,
      where('role', '==', 'client'),
      where('coachId', '==', coachId),
      orderBy('displayName', 'asc')
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => {
      const data = doc.data();
      let createdAtTimestamp: Timestamp;
      if (data.createdAt instanceof Timestamp) {
        createdAtTimestamp = data.createdAt;
      } else if (data.createdAt && typeof data.createdAt.seconds === 'number') {
        createdAtTimestamp = new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds);
      } else {
        createdAtTimestamp = Timestamp.now();
      }
      return {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        role: 'client',
        photoURL: data.photoURL || null,
        createdAt: createdAtTimestamp,
        coachId: data.coachId,
      } as UserProfile;
    });
  } catch (error: any) {
    console.error(`Detailed Firebase Error in getCoachClients for coachID ${coachId}:`, error);
    if (error.code === 'failed-precondition') {
      console.error("This error likely means you need to create a composite index in Firestore. Check the browser console for a link to create it.");
      throw new Error(`Failed to fetch clients for coach ID ${coachId}. A Firestore index is required. Please check the browser's developer console for a link to create it.`);
    }
    throw new Error(`Failed to fetch clients for coach ID ${coachId}. See server logs for details.`);
  }
}
