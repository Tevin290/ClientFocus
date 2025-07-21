'use server';

import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function createSampleCompany() {
  const sampleCompany = {
    name: 'Acme Coaching',
    slug: 'acme-coaching',
    createdAt: serverTimestamp(),
    branding: {
      logoUrl: 'https://via.placeholder.com/150x50?text=ACME',
      primaryColor: '#3b82f6',
      secondaryColor: '#60a5fa',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
    },
  };

  const sampleAdmin = {
    email: 'admin@acme.com',
    displayName: 'Admin User',
    role: 'admin',
    companyId: 'acme-coaching-id',
    createdAt: serverTimestamp(),
  };

  const sampleCoach = {
    email: 'coach@acme.com',
    displayName: 'Coach Smith',
    role: 'coach',
    companyId: 'acme-coaching-id',
    createdAt: serverTimestamp(),
  };

  const sampleClient = {
    email: 'client@acme.com',
    displayName: 'John Client',
    role: 'client',
    companyId: 'acme-coaching-id',
    coachId: 'coach-id',
    createdAt: serverTimestamp(),
  };

  try {
    // Create company
    await setDoc(doc(db, 'companies', 'acme-coaching-id'), sampleCompany);
    
    // Create sample users
    await setDoc(doc(db, 'users', 'admin-id'), sampleAdmin);
    await setDoc(doc(db, 'users', 'coach-id'), sampleCoach);
    await setDoc(doc(db, 'users', 'client-id'), sampleClient);
    
    console.log('Sample data created successfully');
    return { success: true };
  } catch (error) {
    console.error('Error creating sample data:', error);
    return { success: false, error };
  }
}