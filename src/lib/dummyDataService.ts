
'use server';

import { writeBatch, Timestamp, collection, doc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { createUserProfileInFirestore, type UserProfile } from './firestoreService';
import type { NewSessionData } from './firestoreService';

// Helper function to ensure Firebase is configured and db is available
function ensureFirebaseIsOperationalForDummyData() {
  if (!isFirebaseConfigured()) {
    const errorMessage = "Firebase is not configured. Please add your Firebase config to src/lib/firebase.ts or environment variables.";
    console.error(errorMessage + " Cannot generate dummy data.");
    throw new Error(errorMessage);
  }
  if (!db) {
    const dbErrorMessage = "Firestore DB is not initialized. This can happen if Firebase configuration is missing or incorrect. Cannot generate dummy data.";
    console.error(dbErrorMessage);
    throw new Error(dbErrorMessage);
  }
}

const DUMMY_UIDS = {
  admin: 'dummy-admin-uid',
  coach1: 'dummy-coach1-uid',
  coach2: 'dummy-coach2-uid',
  client1: 'dummy-client1-uid',
  client2: 'dummy-client2-uid',
  client3: 'dummy-client3-uid',
};

export async function generateDummyData(): Promise<{ usersCreated: number, sessionsCreated: number }> {
  ensureFirebaseIsOperationalForDummyData(); // Check Firebase config first

  const batch = writeBatch(db);
  let usersCreated = 0;
  let sessionsCreated = 0;

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
      email: 'coach@example.com',
      displayName: 'Coach Taylor',
      role: 'coach',
      photoURL: 'https://placehold.co/100x100.png?text=CT',
    },
    {
      uid: DUMMY_UIDS.coach2,
      email: 'coach.carter@example.com',
      displayName: 'Coach Carter',
      role: 'coach',
      photoURL: 'https://placehold.co/100x100.png?text=CC',
    },
    {
      uid: DUMMY_UIDS.client1,
      email: 'client@example.com',
      displayName: 'Alice Wonderland',
      role: 'client',
      coachId: DUMMY_UIDS.coach1,
      photoURL: 'https://placehold.co/100x100.png?text=AW',
    },
    {
      uid: DUMMY_UIDS.client2,
      email: 'bob.builder@example.com',
      displayName: 'Bob Builder',
      role: 'client',
      coachId: DUMMY_UIDS.coach1,
      photoURL: 'https://placehold.co/100x100.png?text=BB',
    },
    {
      uid: DUMMY_UIDS.client3,
      email: 'charlie.brown@example.com',
      displayName: 'Charlie Brown',
      role: 'client',
      coachId: DUMMY_UIDS.coach2,
      photoURL: 'https://placehold.co/100x100.png?text=CB',
    },
  ];

  for (const userData of usersToCreate) {
    const { uid, ...profileData } = userData;
    // createUserProfileInFirestore will do its own check, but this loop is part of the "generateDummyData" operation.
    // If it fails, the whole dummy data generation should ideally fail or report it.
    try {
      await createUserProfileInFirestore(uid, { ...profileData, createdAt: Timestamp.now() });
      usersCreated++;
    } catch (error) {
       console.error(`Failed to create dummy user ${uid}:`, error);
       // Decide if one user failing should stop the whole batch or just be logged
       // For now, rethrow to indicate the overall operation might be incomplete.
       if (error instanceof Error && (error.message.includes("Firebase is not configured") || error.message.includes("Firestore DB is not initialized"))) {
          throw error;
       }
       throw new Error(`Failed during dummy user creation for ${uid}. Batch might be incomplete.`);
    }
  }

  const sessionsToCreate: NewSessionData[] = [
    {
      coachId: DUMMY_UIDS.coach1,
      coachName: 'Coach Taylor',
      clientId: DUMMY_UIDS.client1,
      clientName: 'Alice Wonderland',
      clientEmail: 'client@example.com',
      sessionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
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
      sessionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
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
      sessionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
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
      sessionDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
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
      sessionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      sessionType: 'Full',
      sessionNotes: 'Reviewed weekly progress and addressed some minor setbacks with positive reframing.',
      summary: 'Progress review and setback management.',
      status: 'Logged',
    },
  ];

  const sessionsCollectionRef = collection(db, 'sessions');
  for (const sessionData of sessionsToCreate) {
    const newSessionRef = doc(sessionsCollectionRef);
    batch.set(newSessionRef, { 
      ...sessionData, 
      sessionDate: Timestamp.fromDate(sessionData.sessionDate),
      createdAt: serverTimestamp(),
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
    if (error instanceof Error && (error.message.includes("Firebase is not configured") || error.message.includes("Firestore DB is not initialized"))) {
      throw error;
    }
    throw new Error("Failed to generate dummy data. Batch commit failed. Check server logs.");
  }
}
