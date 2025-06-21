
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from "@/components/shared/page-header";
import { SessionLogForm } from "@/components/forms/session-log-form";
import { useRole } from "@/context/role-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, TriangleAlert } from "lucide-react";
import { getCoachClients, getSessionById, type UserProfile, type Session } from '@/lib/firestoreService';
import { useToast } from '@/hooks/use-toast';
import { isFirebaseConfigured } from '@/lib/firebase';

export default function EditSessionPage() {
  const { user, role, isLoading: isRoleLoading } = useRole();
  const [clients, setClients] = useState<UserProfile[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { toast } = useToast();
  const params = useParams();
  const sessionId = params.sessionId as string;

  useEffect(() => {
    if (isRoleLoading || !sessionId) return;
    
    if (role === 'coach' && user?.uid && isFirebaseConfigured()) {
      const fetchData = async () => {
        setIsLoadingData(true);
        try {
          const [fetchedClients, fetchedSession] = await Promise.all([
            getCoachClients(user.uid),
            getSessionById(sessionId)
          ]);
          setClients(fetchedClients);
          
          if (fetchedSession && fetchedSession.coachId === user.uid) {
            setSession(fetchedSession);
          } else {
             toast({ title: "Not Found", description: "Session not found or you do not have permission to edit it.", variant: "destructive" });
          }

        } catch (error: any) {
          console.error("Failed to fetch data for edit form:", error);
          toast({ title: "Error", description: error.message || "Could not load data for the form.", variant: "destructive" });
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchData();
    } else {
      setIsLoadingData(false);
    }
  }, [role, user, isRoleLoading, toast, sessionId]);


  if (isLoadingData || isRoleLoading) {
    return (
      <div>
        <PageHeader title="Loading Session..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading session details...</p>
        </div>
      </div>
    );
  }

  if (role !== 'coach' || !user) {
    return (
      <div>
        <PageHeader title="Edit Session" />
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You must be logged in as a coach to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!session) {
    return (
      <div>
        <PageHeader title="Session Not Found" />
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Error Loading Session</AlertTitle>
          <AlertDescription>
            The session could not be loaded. It may have been deleted or you don't have permission to view it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Edit Session" description="Update the details of this coaching session." />
      <div className="mt-8 flex justify-center">
        <SessionLogForm
          coachId={user.uid}
          coachName={user.displayName || "Coach"}
          clients={clients}
          session={session}
        />
      </div>
    </div>
  );
}
