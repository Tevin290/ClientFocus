
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
// import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'; // Step 1: Import
// import { auth } from '@/lib/firebase'; // Step 1: Import
// import { getUserProfile, type UserProfile } from '@/lib/firestoreService'; // Step 1: Import

export type UserRole = 'admin' | 'coach' | 'client' | null;

// Extend to include the full Firebase user and custom profile
interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  // Add other FirebaseUser properties if needed
}

interface RoleContextType {
  user: AuthUser | null; // Firebase authenticated user
  userProfile: any | null; // Your custom user profile from Firestore
  role: UserRole;
  setRole: (role: UserRole) => void; // This might be deprecated if role comes from userProfile
  isLoading: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [role, setRoleState] = useState<UserRole>(null); // Kept for now, might be derived
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Step 2: Listen for Firebase Auth state changes
    // const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    //   if (firebaseUser) {
    //     setUser({
    //       uid: firebaseUser.uid,
    //       email: firebaseUser.email,
    //       displayName: firebaseUser.displayName,
    //     });
    //     // Fetch user profile from Firestore to get the role
    //     const profile = await getUserProfile(firebaseUser.uid);
    //     if (profile) {
    //       setUserProfile(profile);
    //       setRoleState(profile.role); // Set role from Firestore profile
    //       // No longer need to use localStorage for role if fetched from Firestore
    //     } else {
    //       // Handle case where user is authenticated but no profile exists
    //       // Maybe redirect to a profile creation page or set a default/guest role
    //       setRoleState(null); 
    //       setUserProfile(null);
    //     }
    //   } else {
    //     setUser(null);
    //     setUserProfile(null);
    //     setRoleState(null); // Clear role on logout
    //     localStorage.removeItem('userRole'); // Clear legacy role
    //   }
    //   setIsLoading(false);
    // });
    // return () => unsubscribe(); // Cleanup subscription

    // Fallback to localStorage if Firebase Auth is not yet integrated for role
    // This part should eventually be replaced by the Firebase Auth logic above
    try {
      const storedRole = localStorage.getItem('userRole') as UserRole;
      if (storedRole) {
        setRoleState(storedRole);
        // Simulate a user object if role exists for pages expecting user.uid
        if (!user && storedRole) {
             setUser({uid: `mock-${storedRole}-id`, email: `${storedRole}@example.com`, displayName: `${storedRole.charAt(0).toUpperCase() + storedRole.slice(1)} User`});
        }
      }
    } catch (error) {
      console.error("Failed to access localStorage:", error);
    } finally {
      setIsLoading(false); // Ensure loading is set to false after trying localStorage
    }
  }, []); // Empty dependency array means this runs once on mount

  // This setRole might become less relevant if role is strictly derived from Firestore.
  // Or, it could be used by an admin to change another user's role.
  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    // If still using localStorage as a temporary measure:
    if (newRole) {
      try {
        localStorage.setItem('userRole', newRole);
      } catch (error) {
        console.error("Failed to access localStorage:", error);
      }
    } else {
      try {
        localStorage.removeItem('userRole');
      } catch (error) {
        console.error("Failed to access localStorage:", error);
      }
    }
  };

  return (
    <RoleContext.Provider value={{ user, userProfile, role, setRole, isLoading }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
