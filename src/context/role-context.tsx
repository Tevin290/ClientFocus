
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
            // This case is normal during the signup process before the profile is created.
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
  }, []); // Empty dependency array ensures this runs only once on mount

  // Effect to handle redirection logic based on auth state
  React.useEffect(() => {
    if (isLoading) {
      return; // Do nothing while auth state is being determined
    }

    const isAuthPage = pathname === '/login' || pathname === '/signup';
    const isSuccessPage = pathname.startsWith('/coach/log-session/success');

    if (user && role) {
      // User is logged in with a role
      if (isAuthPage) {
        console.log(`[RoleContext] User logged in, redirecting from auth page to /${role}/dashboard.`);
        router.push(`/${role}/dashboard`);
      }
    } else {
      // User is not logged in or has no role
      if (!isAuthPage && !isSuccessPage) {
        console.log(`[RoleContext] User not logged in, redirecting to /login from protected page.`);
        router.push('/login');
      }
    }
  }, [user, role, isLoading, pathname, router]);


  const logout = async () => {
    setIsLoading(true);
    await auth.signOut();
    // onAuthStateChanged will handle clearing state and the effect above will handle redirection.
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
