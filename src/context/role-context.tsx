
'use client';

import type { ReactNode } from 'react';
import React from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
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

  // Effect to handle auth state changes and fetch user profile
  React.useEffect(() => {
    if (!isFirebaseConfigured()) {
      console.warn("[RoleContext] Firebase not configured. Auth state will be ignored.");
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
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
          } else {
            console.warn(`[RoleContext] User ${firebaseUser.uid} is authenticated but has no profile in Firestore.`);
            setUserProfile(null);
            setRoleState(null);
          }
        } catch (error) {
          console.error("[RoleContext] Error fetching user profile:", error);
          setUserProfile(null);
          setRoleState(null);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setRoleState(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Effect to handle redirection logic based on auth state
  React.useEffect(() => {
    // Wait until the initial auth state check is complete
    if (isLoading) {
      return;
    }

    const isAuthPage = pathname === '/login' || pathname === '/signup';
    
    // Case 1: User is authenticated and has a role
    if (user && role) {
      if (isAuthPage) {
        console.log(`[RoleContext] User is on auth page. Redirecting to /${role}/dashboard...`);
        router.replace(`/${role}/dashboard`);
      }
      // If user is on another page, they are allowed to be there. Do nothing.
    } 
    // Case 2: User is not authenticated (or has no role)
    else {
      const isProtectedRoute = !isAuthPage && !pathname.startsWith('/coach/log-session/success');
      if (isProtectedRoute) {
        console.log(`[RoleContext] User not authenticated, redirecting to /login from protected page.`);
        router.replace('/login');
      }
      // If user is on an auth page, they are allowed to be there. Do nothing.
    }
  }, [isLoading, user, role, pathname, router]);


  const logout = async () => {
    setIsLoading(true);
    await auth.signOut();
    // onAuthStateChanged will handle clearing state and the redirection effect will handle routing to /login.
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
