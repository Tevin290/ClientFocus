
'use server';

import { writeBatch, Timestamp, collection, doc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile } from './firestoreService';

/**
 * Generates dummy data for a specific, existing coach.
 * This function creates new dummy CLIENTS and assigns them to the coach,
 * then creates dummy SESSIONS for those new clients.
 * This is a server-side action.
 * @param coach An object containing the coach's uid, displayName, and companyId.
 * @returns A promise that resolves with the number of clients and sessions created.
 */
export async function generateDummyDataForCoach(coach: { coachId: string; coachName: string; companyId: string; }): Promise<{ clientsCreated: number, sessionsCreated: number }> {
  if (!db) {
    throw new Error("Firestore DB is not initialized. This can happen if Firebase configuration is missing or incorrect.");
  }
  
  console.log(`[DummyData] Starting generation for coach: ${coach.coachName} (${coach.coachId}) in company ${coach.companyId}`);

  const batch = writeBatch(db);
  let clientsCreated = 0;
  let sessionsCreated = 0;

  const usersCollectionRef = collection(db, 'users');

  // 1. Create a few dummy clients for this coach
  const dummyClients = [
    {
      displayName: 'Danny Devito',
      email: `danny.devito.${Date.now()}@example.com`,
      photoURL: 'https://placehold.co/100x100.png?text=DD',
    },
    {
      displayName: 'Frank Reynolds',
      email: `frank.reynolds.${Date.now()}@example.com`,
      photoURL: 'https://placehold.co/100x100.png?text=FR',
    },
  ];

  const createdClients: Array<{ id: string; name: string; email: string }> = [];

  for (const client of dummyClients) {
    const newClientRef = doc(usersCollectionRef); // Auto-generate ID
    const newClientProfile: Omit<UserProfile, 'createdAt'> & { createdAt: any } = {
      uid: newClientRef.id,
      email: client.email,
      displayName: client.displayName,
      role: 'client',
      photoURL: client.photoURL,
      createdAt: serverTimestamp(),
      coachId: coach.coachId, // Assign to the selected coach
      companyId: coach.companyId, // Assign to the coach's company
    };
    batch.set(newClientRef, newClientProfile);
    clientsCreated++;
    createdClients.push({ id: newClientRef.id, name: client.displayName, email: client.email });
  }
  
  console.log(`[DummyData] Staged ${clientsCreated} new client documents for creation.`);


  // 2. Create a few dummy sessions for these new clients
  const sessionsCollectionRef = collection(db, 'sessions');
  const sessionTemplates = [
    {
      clientIndex: 0,
      daysAgo: 10,
      sessionType: 'Full',
      notes: 'Initial session focused on leadership development. We established key goals for the next quarter.',
      summary: 'Leadership goal setting.',
      status: 'Billed',
    },
    {
      clientIndex: 0,
      daysAgo: 3,
      sessionType: 'Half',
      notes: 'Quick follow-up on action items. Good progress made, but we identified a roadblock with team alignment.',
      summary: 'Action item review.',
      status: 'Under Review',
    },
    {
      clientIndex: 1,
      daysAgo: 8,
      sessionType: 'Full',
      notes: 'Session on improving communication strategies. We role-played some difficult conversations.',
      summary: 'Communication strategy practice.',
      status: 'Approved',
    },
  ] as const;

  for (const template of sessionTemplates) {
    const clientUser = createdClients[template.clientIndex];
    const newSessionRef = doc(sessionsCollectionRef);
    
    const sessionData = {
      coachId: coach.coachId,
      coachName: coach.coachName,
      clientId: clientUser.id,
      clientName: clientUser.name,
      clientEmail: clientUser.email,
      companyId: coach.companyId, // Assign session to the coach's company
      sessionDate: Timestamp.fromDate(new Date(Date.now() - template.daysAgo * 24 * 60 * 60 * 1000)),
      sessionType: template.sessionType,
      sessionNotes: template.notes,
      summary: template.summary,
      status: template.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isArchived: false, // Default to not archived
    };

    batch.set(newSessionRef, sessionData);
    sessionsCreated++;
  }
  
  console.log(`[DummyData] Staged ${sessionsCreated} new session documents for creation.`);
  console.log("[DummyData] Attempting to commit batch write to Firestore...");


  await batch.commit();

  console.log(`[DummyData] Batch commit successful. Created ${clientsCreated} clients and ${sessionsCreated} sessions for coach ${coach.coachName}.`);
  return { clientsCreated, sessionsCreated };
}
