
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfile, type UserProfile } from '@/lib/firestoreService';
import { useRouter, usePathname } from 'next/navigation';


export type UserRole = 'admin' | 'coach' | 'client' | null;

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface RoleContextType {
  user: AuthUser | null;
  userProfile: UserProfile | null;
  role: UserRole;
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
        console.log('[RoleContext] onAuthStateChanged: User is authenticated. UID:', firebaseUser.uid);
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
            console.log(`[RoleContext] User profile fetched for ${firebaseUser.uid}, role: ${profile.role}`);
            // If user has a profile and is trying to access login/signup, redirect them.
            if ((pathname === '/login' || pathname === '/signup') && profile.role) { 
              console.log(`[RoleContext] User has profile, redirecting from ${pathname} to /${profile.role}/dashboard`);
              router.push(`/${profile.role}/dashboard`);
            }
          } else {
            // No profile found in Firestore for an authenticated user.
            console.warn(`[RoleContext] User ${firebaseUser.uid} authenticated but no Firestore profile found.`);
            setUserProfile(null);
            setRoleState(null);
            // If on a protected page, redirect to login. Allow to stay on login/signup.
            if (pathname !== '/login' && pathname !== '/signup' && !pathname.startsWith('/coach/log-session/success')) {
                console.log(`[RoleContext] No profile, on protected page ${pathname}, redirecting to login.`);
                router.push('/login'); 
             } else {
                console.log(`[RoleContext] No profile, but on ${pathname}. Allowing user to proceed (e.g., to complete signup).`);
             }
          }
        } catch (error: any) {
            console.warn(`[RoleContext] Error fetching user profile for UID ${firebaseUser.uid}: ${error.message}. This can happen if signup didn't complete.`);
            setUserProfile(null);
            setRoleState(null);
            // If profile fetch fails and on a protected page, redirect to login.
            // Allow to stay on login/signup to attempt action.
            if (pathname !== '/login' && pathname !== '/signup' && !pathname.startsWith('/coach/log-session/success')) {
                console.log(`[RoleContext] Profile fetch error, on protected page ${pathname}, redirecting to login.`);
                router.push('/login');
            } else {
                 console.log(`[RoleContext] Profile fetch error, but on ${pathname}. Allowing user to proceed.`);
            }
        }

      } else { 
        // User is logged out or not authenticated.
        setUser(null);
        setUserProfile(null);
        setRoleState(null);
        console.log("[RoleContext] User logged out or not authenticated.");
        // If not on a public page, redirect to login.
        if (
          pathname !== '/login' &&
          pathname !== '/signup' &&
          !pathname.startsWith('/coach/log-session/success') // Allow success page without full auth
        ) {
            console.log(`[RoleContext] User not authenticated, on ${pathname}, redirecting to login.`);
            router.push('/login');
        }
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [router, pathname]);

  const logout = async () => {
    setIsLoading(true); // Indicate loading during logout
    try {
      await auth.signOut();
      // onAuthStateChanged will handle setting user, userProfile, and role to null
      // and redirecting to /login.
      console.log("[RoleContext] User successfully signed out.");
    } catch (error) {
      console.error("[RoleContext] Error signing out: ", error);
    } finally {
      // Explicitly clear state here as well, though onAuthStateChanged should also do it.
      setUser(null);
      setUserProfile(null);
      setRoleState(null);
      setIsLoading(false);
       // Router push to /login is handled by the onAuthStateChanged listener when user becomes null
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
