
'use client';

import type { ReactNode } from 'react';
import React from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { getUserProfile, getCompanyProfile, type UserProfile, type CompanyProfile } from '@/lib/firestoreService';
import { useRouter, usePathname } from 'next/navigation';

export type UserRole = 'admin' | 'super-admin' | 'coach' | 'client' | null;

interface AuthUser {
  companyId: string;
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface RoleContextType {
  user: AuthUser | null;
  userProfile: UserProfile | null;
  companyProfile: CompanyProfile | null;
  role: UserRole;
  isLoading: boolean;
  logout: () => Promise<void>;
  refetchUserProfile: () => Promise<void>;
  refetchCompanyProfile: () => Promise<void>;
}

const RoleContext = React.createContext<RoleContextType | undefined>(undefined);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [companyProfile, setCompanyProfile] = React.useState<CompanyProfile | null>(null);
  const [role, setRoleState] = React.useState<UserRole>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchFullProfile = React.useCallback(async (firebaseUser: FirebaseUser) => {
    try {
        const profile = await getUserProfile(firebaseUser.uid);
        if (profile) {
            setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                companyId: profile.companyId ?? '',
            });
            setUserProfile(profile);
            setRoleState(profile.role);
            if (profile.companyId) {
                const company = await getCompanyProfile(profile.companyId);
                setCompanyProfile(company);
            } else {
                setCompanyProfile(null);
            }
        } else {
            console.warn(`[RoleContext] User ${firebaseUser.uid} is authenticated but has no profile in Firestore.`);
            setUserProfile(null);
            setCompanyProfile(null);
            setRoleState(null);
        }
    } catch (error) {
        console.error("[RoleContext] Error fetching user or company profile:", error);
        setUserProfile(null);
        setCompanyProfile(null);
        setRoleState(null);
    }
  }, [setUser, setUserProfile, setCompanyProfile, setRoleState]);

  React.useEffect(() => {
    if (!isFirebaseConfigured()) {
      console.warn("[RoleContext] Firebase not configured. Auth state will be ignored.");
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        await fetchFullProfile(firebaseUser);
      } else {
        setUser(null);
        setUserProfile(null);
        setCompanyProfile(null);
        setRoleState(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [fetchFullProfile]);


  React.useEffect(() => {
    if (isLoading) {
      return;
    }

    console.log('[RoleContext] Redirect check:', { user: !!user, role, pathname, isLoading });
    
    const isAuthPage = pathname === '/login' || pathname === '/signup';
    const isCompanyAuthPage = pathname.match(/^\/[a-z0-9-]+\/(login|signup)$/);
    const isCompanyLandingPage = pathname.match(/^\/[a-z0-9-]+$/);
    const isStripeReturn = pathname.startsWith('/stripe/connect/return');
    
    if (user && role) {
      if (isAuthPage || isCompanyAuthPage) {
        let dashboardPath = `/${role}/dashboard`;
        if (role === 'super-admin') dashboardPath = '/admin/dashboard';
        
        console.log(`[RoleContext] User is on auth page. Redirecting to ${dashboardPath}...`);
        router.replace(dashboardPath);
      }
    } 
    else {
      const isPublicRoute = isAuthPage || isCompanyAuthPage || isCompanyLandingPage || 
                           pathname === '/' || isStripeReturn;
      const isProtectedRoute = !isPublicRoute;
      
      if (isProtectedRoute) {
        console.log(`[RoleContext] User not authenticated, redirecting to /login from protected page.`);
        router.replace('/login');
      }
    }
  }, [isLoading, user, role, pathname, router]);

  const refetchUserProfile = React.useCallback(async () => {
    if (!user?.uid) {
      console.warn("[RoleContext] Cannot refetch user profile, no user ID available.");
      return;
    }
    const profile = await getUserProfile(user.uid);
    if (profile) {
      setUserProfile(profile);
      setRoleState(profile.role);
    }
  }, [user]);

  const refetchCompanyProfile = React.useCallback(async () => {
      if (!userProfile?.companyId) {
          console.warn("[RoleContext] Cannot refetch company profile, no company ID available.");
          return;
      }
      const company = await getCompanyProfile(userProfile.companyId);
      setCompanyProfile(company);
  }, [userProfile]);


  const logout = async () => {
    setIsLoading(true);
    await auth.signOut();
  };

  return (
    <RoleContext.Provider value={{ user, userProfile, companyProfile, role, isLoading, logout, refetchUserProfile, refetchCompanyProfile }}>
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
