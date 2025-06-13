
'use client'; 

import React, { useState, useEffect } from 'react';
import { PageHeader } from "@/components/shared/page-header";
import { SessionCard, type Session } from "@/components/shared/session-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { History, Loader2 } from "lucide-react";
import { useRole } from '@/context/role-context';
import { getClientSessions } from '@/lib/firestoreService';
import { isFirebaseConfigured } from '@/lib/firebase';

export default function ClientHistoryPage() {
  const { role, user, isLoading: isRoleLoading } = useRole();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [firebaseAvailable, setFirebaseAvailable] = useState(false);

  useEffect(() => {
    setFirebaseAvailable(isFirebaseConfigured());
  }, []);

  useEffect(() => {
    if (isRoleLoading || !firebaseAvailable) {
      // Wait for role context to load or if Firebase is not configured
      if (!isRoleLoading && !firebaseAvailable) setIsLoadingSessions(false); // Stop loading if FB not configured
      return;
    }

    if (role === 'client' && user?.uid) {
      const fetchSessions = async () => {
        setIsLoadingSessions(true);
        try {
          const fetchedSessions = await getClientSessions(user.uid); 
          setSessions(fetchedSessions);
        } catch (error) {
          console.error("Failed to fetch client sessions:", error);
          // Handle error (e.g., show toast)
        } finally {
          setIsLoadingSessions(false);
        }
      };
      fetchSessions();
    } else {
      setIsLoadingSessions(false);
      setSessions([]); // Clear sessions if not applicable
    }
  }, [role, user, isRoleLoading, firebaseAvailable]);

  if (isLoadingSessions || isRoleLoading) {
    return (
      <div>
        <PageHeader title="My Session History" description="Review your past coaching sessions, notes, and recordings." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading your sessions...</p>
        </div>
      </div>
    );
  }

  if (!firebaseAvailable) {
     return (
      <div>
        <PageHeader title="My Session History" description="Review your past coaching sessions, notes, and recordings." />
        <Alert variant="destructive" className="shadow-light">
          <History className="h-5 w-5" />
          <AlertTitle className="font-headline">Feature Unavailable</AlertTitle>
          <AlertDescription>
            Firebase is not configured. Session history cannot be loaded. Please contact support or the administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="My Session History" description="Review your past coaching sessions, notes, and recordings." />
      
      {sessions.length === 0 ? (
        <Alert className="shadow-light">
          <History className="h-5 w-5" />
          <AlertTitle className="font-headline">No Sessions Yet!</AlertTitle>
          <AlertDescription>
            Your past coaching sessions will appear here once they are logged by your coach.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <SessionCard 
              key={session.id} 
              session={session}
            />
          ))}
        </div>
      )}
    </div>
  );
}
