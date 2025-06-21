
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from "@/components/shared/page-header";
import { SessionCard, type Session } from "@/components/shared/session-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ClipboardList, Edit3, PlusCircle, Loader2, TriangleAlert } from "lucide-react"; 
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRole } from '@/context/role-context';
import { getCoachSessions } from '@/lib/firestoreService';
import { useToast } from '@/hooks/use-toast';
import { isFirebaseConfigured } from '@/lib/firebase';

export default function CoachMySessionsPage() {
  const { role, user, isLoading: isRoleLoading } = useRole();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const { toast } = useToast();
  const [firebaseAvailable, setFirebaseAvailable] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setFirebaseAvailable(isFirebaseConfigured());
  }, []);

  useEffect(() => {
    if (isRoleLoading || !firebaseAvailable) {
      if (!isRoleLoading && !firebaseAvailable) setIsLoadingSessions(false);
      return;
    }

    if (role === 'coach' && user?.uid) {
      const fetchSessions = async () => {
        setIsLoadingSessions(true);
        try {
          const fetchedSessions = await getCoachSessions(user.uid);
          setSessions(fetchedSessions);
        } catch (error) {
          console.error("Failed to fetch coach sessions:", error);
          toast({ title: "Error", description: "Could not load your sessions.", variant: "destructive" });
        } finally {
          setIsLoadingSessions(false);
        }
      };
      fetchSessions();
    } else {
      setSessions([]);
      setIsLoadingSessions(false);
    }
  }, [role, user, isRoleLoading, toast, firebaseAvailable]);


  const handleEditSession = (sessionId: string) => {
    router.push(`/coach/my-sessions/${sessionId}/edit`);
  };

  if (isLoadingSessions || isRoleLoading) {
    return (
      <div>
        <PageHeader title="My Logged Sessions" description="Review and manage all your past coaching sessions." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading your sessions...</p>
        </div>
      </div>
    );
  }

  if (role !== 'coach') {
     return (
      <div>
        <PageHeader title="My Logged Sessions" />
        <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>You must be a coach to view this page.</AlertDescription>
        </Alert>
      </div>
     );
  }

  if (!firebaseAvailable) {
     return (
      <div>
        <PageHeader title="My Logged Sessions" description="Review and manage all your past coaching sessions." />
        <Alert variant="destructive" className="shadow-light">
          <TriangleAlert className="h-5 w-5" />
          <AlertTitle className="font-headline">Feature Unavailable</AlertTitle>
          <AlertDescription>
            Firebase is not configured. Session data cannot be loaded.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="My Logged Sessions" 
        description="Review and manage all your past coaching sessions."
        actions={
          <Button asChild>
            <Link href="/coach/log-session">
              <PlusCircle className="mr-2 h-4 w-4" />
              Log New Session
            </Link>
          </Button>
        }
      />
      
      {sessions.length === 0 ? (
        <Alert className="shadow-light">
          <ClipboardList className="h-5 w-5" />
          <AlertTitle className="font-headline">No Sessions Logged Yet!</AlertTitle>
          <AlertDescription>
            Your logged coaching sessions will appear here. <Link href="/coach/log-session" className="text-primary hover:underline">Log your first session now.</Link>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <div key={session.id} className="flex flex-col">
              <SessionCard 
                session={session}
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 w-full hover:border-primary" 
                onClick={() => handleEditSession(session.id)}
              >
                <Edit3 className="mr-2 h-4 w-4" /> Edit Session
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
