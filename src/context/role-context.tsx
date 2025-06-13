
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
        console.log('[RoleContext] onAuthStateChanged: User is authenticated. UID:', firebaseUser.uid, 'Email:', firebaseUser.email, 'Display Name:', firebaseUser.displayName);
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        });
        
        try {
          console.log(`[RoleContext] Attempting to fetch profile for UID: ${firebaseUser.uid}...`);
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile) {
            setUserProfile(profile);
            setRoleState(profile.role);
            console.log(`[RoleContext] User profile fetched for ${firebaseUser.uid}, role set from Firestore: ${profile.role}`);
            if ((pathname === '/login' || pathname === '/signup') && profile.role) { 
              router.push(`/${profile.role}/dashboard`);
            }
          } else {
            console.warn(`[RoleContext] User ${firebaseUser.uid} authenticated but no Firestore profile found or profile was null (getUserProfile returned null).`);
            // This case is critical if createUserProfileInFirestore failed.
            setUserProfile(null);
            setRoleState(null);
             if (pathname !== '/login' && pathname !== '/signup') {
                console.log('[RoleContext] No profile found, redirecting to login.');
                router.push('/login'); 
             }
          }
        } catch (error) {
            console.error("[RoleContext] Error fetching user profile during auth state change:", error);
            setUserProfile(null);
            setRoleState(null);
            if (pathname !== '/login' && pathname !== '/signup') {
                console.log('[RoleContext] Error fetching profile, redirecting to login.');
                router.push('/login');
            }
        }

      } else { // User is logged out
        setUser(null);
        setUserProfile(null);
        setRoleState(null);
        console.log("[RoleContext] User logged out or not authenticated.");
        if (
          pathname !== '/login' &&
          pathname !== '/signup' &&
          !pathname.startsWith('/coach/log-session/success')
        ) {
            console.log('[RoleContext] User not authenticated, redirecting to login from path:', pathname);
            router.push('/login');
        }
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [router, pathname]);

  const logout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("[RoleContext] Error signing out: ", error);
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

