
'use server';

import { writeBatch, Timestamp, collection } from 'firebase/firestore';
import { db } from './firebase';
import { createUserProfileInFirestore, type UserProfile } from './firestoreService'; // Assuming UserProfile is correctly typed
import type { NewSessionData } from './firestoreService';

// Helper to generate a UID (for dummy data - in real app, Firebase Auth provides this)
// For dummy data that aligns with auth, we'll use predefined UIDs.
const DUMMY_UIDS = {
  admin: 'dummy-admin-uid',
  coach1: 'dummy-coach1-uid',
  coach2: 'dummy-coach2-uid',
  client1: 'dummy-client1-uid',
  client2: 'dummy-client2-uid',
  client3: 'dummy-client3-uid',
};

export async function generateDummyData(): Promise<{ usersCreated: number, sessionsCreated: number }> {
  if (!db) {
    throw new Error("Firestore DB is not initialized. Cannot generate dummy data.");
  }

  const batch = writeBatch(db);
  let usersCreated = 0;
  let sessionsCreated = 0;

  // --- Create Dummy Users ---
  const usersToCreate: Array<Omit<UserProfile, 'createdAt' | 'uid'> & { uid: string, email: string }> = [
    {
      uid: DUMMY_UIDS.admin,
      email: 'admin@example.com',
      displayName: 'Admin User',
      role: 'admin',
      photoURL: 'https://placehold.co/100x100.png?text=AU',
    },
    {
      uid: DUMMY_UIDS.coach1,
      email: 'coach@example.com', // Matches one of the Firebase Auth dummy users
      displayName: 'Coach Taylor',
      role: 'coach',
      photoURL: 'https://placehold.co/100x100.png?text=CT',
    },
    {
      uid: DUMMY_UIDS.coach2,
      email: 'coach.carter@example.com', // Needs separate Firebase Auth user
      displayName: 'Coach Carter',
      role: 'coach',
      photoURL: 'https://placehold.co/100x100.png?text=CC',
    },
    {
      uid: DUMMY_UIDS.client1,
      email: 'client@example.com', // Matches one of the Firebase Auth dummy users
      displayName: 'Alice Wonderland',
      role: 'client',
      coachId: DUMMY_UIDS.coach1, // Assign to Coach Taylor
      photoURL: 'https://placehold.co/100x100.png?text=AW',
    },
    {
      uid: DUMMY_UIDS.client2,
      email: 'bob.builder@example.com', // Needs separate Firebase Auth user
      displayName: 'Bob Builder',
      role: 'client',
      coachId: DUMMY_UIDS.coach1,
      photoURL: 'https://placehold.co/100x100.png?text=BB',
    },
    {
      uid: DUMMY_UIDS.client3,
      email: 'charlie.brown@example.com', // Needs separate Firebase Auth user
      displayName: 'Charlie Brown',
      role: 'client',
      coachId: DUMMY_UIDS.coach2, // Assign to Coach Carter
      photoURL: 'https://placehold.co/100x100.png?text=CB',
    },
  ];

  for (const userData of usersToCreate) {
    const { uid, ...profileData } = userData;
    // We are calling this directly, but it uses setDoc which is fine for batch.
    // For createUserProfileInFirestore, it does a setDoc itself, so it can't be directly added to a batch
    // unless we replicate its logic here or modify it to accept a batch.
    // For simplicity of this function, we'll call it directly. It's less efficient for many users.
    // A better approach for batching user creation would be:
    // const userDocRef = doc(db, 'users', uid);
    // batch.set(userDocRef, { ...profileData, createdAt: Timestamp.now() });
    // For now, using the existing service function:
    await createUserProfileInFirestore(uid, { ...profileData, createdAt: Timestamp.now() });
    usersCreated++;
  }


  // --- Create Dummy Sessions ---
  const sessionsToCreate: NewSessionData[] = [
    {
      coachId: DUMMY_UIDS.coach1,
      coachName: 'Coach Taylor',
      clientId: DUMMY_UIDS.client1,
      clientName: 'Alice Wonderland',
      clientEmail: 'client@example.com',
      sessionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      sessionType: 'Full',
      sessionNotes: 'Initial goal setting session. Discussed long-term aspirations and short-term objectives. Alice is very motivated.',
      summary: 'Goal setting and motivation assessment.',
      status: 'Logged',
      videoLink: 'https://example.com/dummy_video_1',
    },
    {
      coachId: DUMMY_UIDS.coach1,
      coachName: 'Coach Taylor',
      clientId: DUMMY_UIDS.client1,
      clientName: 'Alice Wonderland',
      clientEmail: 'client@example.com',
      sessionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      sessionType: 'Half',
      sessionNotes: 'Follow-up on action items from last week. Good progress on task A, need more focus on task B. Brainstormed solutions.',
      summary: 'Action item review and problem-solving.',
      status: 'Reviewed',
    },
    {
      coachId: DUMMY_UIDS.coach1,
      coachName: 'Coach Taylor',
      clientId: DUMMY_UIDS.client2,
      clientName: 'Bob Builder',
      clientEmail: 'bob.builder@example.com',
      sessionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      sessionType: 'Full',
      sessionNotes: 'Discussed project management techniques and tool adoption. Bob is exploring new software for his team.',
      summary: 'Project management strategies.',
      status: 'Logged',
    },
    {
      coachId: DUMMY_UIDS.coach2,
      coachName: 'Coach Carter',
      clientId: DUMMY_UIDS.client3,
      clientName: 'Charlie Brown',
      clientEmail: 'charlie.brown@example.com',
      sessionDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      sessionType: 'Full',
      sessionNotes: 'Working on confidence building and communication skills. Role-played a few scenarios. Charlie showed improvement.',
      summary: 'Confidence and communication practice.',
      status: 'Billed',
    },
     {
      coachId: DUMMY_UIDS.coach2,
      coachName: 'Coach Carter',
      clientId: DUMMY_UIDS.client3,
      clientName: 'Charlie Brown',
      clientEmail: 'charlie.brown@example.com',
      sessionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      sessionType: 'Full',
      sessionNotes: 'Reviewed weekly progress and addressed some minor setbacks with positive reframing.',
      summary: 'Progress review and setback management.',
      status: 'Logged',
    },
  ];

  const sessionsCollectionRef = collection(db, 'sessions');
  for (const sessionData of sessionsToCreate) {
    const newSessionRef = doc(sessionsCollectionRef); // Auto-generate ID
    batch.set(newSessionRef, { 
      ...sessionData, 
      sessionDate: Timestamp.fromDate(sessionData.sessionDate),
      createdAt: serverTimestamp(), // Use serverTimestamp for batch
      updatedAt: serverTimestamp(),
    });
    sessionsCreated++;
  }

  try {
    await batch.commit();
    console.log(`Successfully created ${usersCreated} users and ${sessionsCreated} sessions.`);
    return { usersCreated, sessionsCreated };
  } catch (error) {
    console.error("Error committing batch for dummy data:", error);
    throw new Error("Failed to generate dummy data. Check server logs.");
  }
}
