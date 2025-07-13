
import { writeBatch, Timestamp, collection, doc, serverTimestamp, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface Company {
    id: string;
    name: string;
    createdAt: Timestamp;
}

/**
 * Migrates all existing users and sessions to a default company.
 * This is intended as a one-time operation to transition a single-tenant system
 * to a multi-tenant one.
 * @returns A promise that resolves with the number of users and sessions migrated.
 */
export async function migrateDataToCompany(companyDetails: { id: string, name: string }): Promise<{ usersUpdated: number, sessionsUpdated: number }> {
    if (!db) {
        throw new Error("Firestore DB is not initialized.");
    }

    console.log(`[Migration] Starting migration to company: ${companyDetails.name} (${companyDetails.id})`);

    const batch = writeBatch(db);
    let usersUpdated = 0;
    let sessionsUpdated = 0;

    // 1. Create the company document
    const companyRef = doc(db, 'companies', companyDetails.id);
    batch.set(companyRef, {
        name: companyDetails.name,
        createdAt: serverTimestamp(),
    });
    console.log(`[Migration] Staged creation of company document for ${companyDetails.name}.`);

    // 2. Get all users and add update operations to the batch
    const usersCollectionRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollectionRef);
    usersSnapshot.forEach(userDoc => {
        const userRef = doc(db, 'users', userDoc.id);
        batch.update(userRef, { companyId: companyDetails.id });
        usersUpdated++;
    });
    console.log(`[Migration] Staged ${usersUpdated} users for update.`);

    // 3. Get all sessions and add update operations to the batch
    const sessionsCollectionRef = collection(db, 'sessions');
    const sessionsSnapshot = await getDocs(sessionsCollectionRef);
    sessionsSnapshot.forEach(sessionDoc => {
        const sessionRef = doc(db, 'sessions', sessionDoc.id);
        batch.update(sessionRef, { companyId: companyDetails.id });
        sessionsUpdated++;
    });
    console.log(`[Migration] Staged ${sessionsUpdated} sessions for update.`);

    // 4. Commit the single, large batch
    console.log('[Migration] Committing batch write...');
    await batch.commit();
    console.log('[Migration] Batch commit successful.');

    return { usersUpdated, sessionsUpdated };
}
