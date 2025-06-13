
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfile, type UserProfile } from '@/lib/firestoreService';
import { useRouter, usePathname } from 'next/navigation';


export type UserRole = 'admin' | 'coach' | 'client' | null;

// This will now primarily hold the Firebase User object
interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  // Add other FirebaseUser properties if needed
}

interface RoleContextType {
  user: AuthUser | null; // Firebase authenticated user
  userProfile: UserProfile | null; // Your custom user profile from Firestore
  role: UserRole;
  // setRole: (role: UserRole) => void; // This will be mostly managed by auth state
  isLoading: boolean;
  logout: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [role, setRoleState] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setIsLoading(true);
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        });
        
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile) {
            setUserProfile(profile);
            setRoleState(profile.role);
            console.log("User authenticated, role set from Firestore:", profile.role);
            if (pathname === '/login' && profile.role) {
              router.push(`/${profile.role}/dashboard`);
            }
          } else {
            // This case might happen if a user exists in Firebase Auth but not in Firestore `users` collection.
            // This could be an error state or a new user who needs a profile created.
            console.warn(`User ${firebaseUser.uid} authenticated but no Firestore profile found.`);
            setUserProfile(null);
            setRoleState(null);
            // Potentially log them out or redirect to a profile setup page
             if (pathname !== '/login') router.push('/login'); // Redirect to login if no profile
          }
        } catch (error) {
            console.error("Error fetching user profile during auth state change:", error);
            setUserProfile(null);
            setRoleState(null);
            // Potentially log them out
            if (pathname !== '/login') router.push('/login');
        }

      } else { // User is logged out
        setUser(null);
        setUserProfile(null);
        setRoleState(null);
        console.log("User logged out or not authenticated.");
        if (pathname !== '/login' && !pathname.startsWith('/coach/log-session/success')) { // Allow success page access without immediate redirect
            router.push('/login');
        }
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [router, pathname]); // Added router and pathname to dependencies

  const logout = async () => {
    try {
      await auth.signOut();
      // onAuthStateChanged will handle clearing user, userProfile, and role states
      // and redirecting to login.
    } catch (error) {
      console.error("Error signing out: ", error);
      // Handle logout error (e.g., show a toast)
    }
  };


  return (
    <RoleContext.Provider value={{ user, userProfile, role, isLoading, logout }}>
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
