
'use client';

import type { ReactNode } from 'react';
import React from 'react'; // Changed to default import for explicit hook usage
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase'; // Ensure isFirebaseConfigured is imported if used
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

const RoleContext = React.createContext<RoleContextType | undefined>(undefined);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [role, setRoleState] = React.useState<UserRole>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!isFirebaseConfigured()) {
      console.warn("[RoleContext] Firebase not configured. Auth state changes will be limited.");
      setIsLoading(false);
      // If on protected page and Firebase isn't set up, push to login to avoid app crash
      if (pathname !== '/login' && pathname !== '/signup') {
        router.push('/login');
      }
      return; // Stop further execution if Firebase is not configured
    }

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
            if ((pathname === '/login' || pathname === '/signup') && profile.role) {
              console.log(`[RoleContext] User has profile, redirecting from ${pathname} to /${profile.role}/dashboard`);
              router.push(`/${profile.role}/dashboard`);
            }
          } else {
            // Profile does not exist in Firestore
            console.log(`[RoleContext] No Firestore profile found for authenticated user UID: ${firebaseUser.uid}. This is expected during initial signup.`);
            setUserProfile(null);
            setRoleState(null);
            // Allow user to stay on login/signup page to complete profile creation or login
            if (pathname === '/login' || pathname === '/signup' || pathname.startsWith('/coach/log-session/success')) {
              console.log(`[RoleContext] No profile, on ${pathname}. Allowing user to proceed.`);
            } else {
              // If on a protected page without a profile, redirect to login
              console.log(`[RoleContext] No profile, on protected page ${pathname}, redirecting to login.`);
              router.push('/login');
            }
          }
        } catch (error: any) {
          // Error fetching profile (e.g., permission denied if rules are strict on non-existent doc reads)
          console.warn(`[RoleContext] Error fetching user profile for UID ${firebaseUser.uid} during auth state change:`, error.message);
          setUserProfile(null);
          setRoleState(null);
          if (pathname === '/login' || pathname === '/signup' || pathname.startsWith('/coach/log-session/success')) {
            console.log(`[RoleContext] Profile fetch error, but on ${pathname}. Allowing user to proceed.`);
          } else {
            console.log(`[RoleContext] Profile fetch error, on protected page ${pathname}, redirecting to login.`);
            router.push('/login');
          }
        }
      } else { 
        setUser(null);
        setUserProfile(null);
        setRoleState(null);
        console.log("[RoleContext] User logged out or not authenticated.");
        if (
          pathname !== '/login' &&
          pathname !== '/signup' &&
          !pathname.startsWith('/coach/log-session/success')
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
    if (!isFirebaseConfigured()) {
      console.warn("[RoleContext] Firebase not configured. Logout may not fully clear state if auth was never initialized.");
      setUser(null);
      setUserProfile(null);
      setRoleState(null);
      router.push('/login'); // Force redirect
      return;
    }
    setIsLoading(true);
    try {
      await auth.signOut();
      console.log("[RoleContext] User successfully signed out via context logout.");
      // onAuthStateChanged will handle setting user/profile/role to null and redirecting
    } catch (error) {
      console.error("[RoleContext] Error signing out: ", error);
      // Fallback state clearing, though onAuthStateChanged should manage this
      setUser(null);
      setUserProfile(null);
      setRoleState(null);
      if (pathname !== '/login') router.push('/login'); // Ensure redirection
    } finally {
      setIsLoading(false); 
    }
  };

  return (
    <RoleContext.Provider value={{ user, userProfile, role, isLoading, logout }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = (): RoleContextType => {
  const context = React.useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
