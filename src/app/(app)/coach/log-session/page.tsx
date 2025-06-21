
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/shared/page-header";
import { SessionLogForm } from "@/components/forms/session-log-form";
import { useRole } from "@/context/role-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, TriangleAlert, Users } from "lucide-react";
import { getCoachClients, type UserProfile } from '@/lib/firestoreService';
import { useToast } from '@/hooks/use-toast';
import { isFirebaseConfigured } from '@/lib/firebase';

export default function CoachLogSessionPage() {
  const { user, role, isLoading: isRoleLoading } = useRole();
  const [clients, setClients] = useState<UserProfile[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isRoleLoading) return;
    
    if (role === 'coach' && user?.uid && isFirebaseConfigured()) {
      const fetchClients = async () => {
        setIsLoadingClients(true);
        try {
          const fetchedClients = await getCoachClients(user.uid);
          setClients(fetchedClients);
        } catch (error: any) {
          console.error("Failed to fetch clients for form:", error);
          toast({ title: "Error", description: error.message || "Could not load your clients for the form.", variant: "destructive" });
        } finally {
          setIsLoadingClients(false);
        }
      };
      fetchClients();
    } else {
      setIsLoadingClients(false);
    }
  }, [role, user, isRoleLoading, toast]);


  if (isRoleLoading || isLoadingClients) {
    return (
      <div>
        <PageHeader title="Log New Session" />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading user data and clients...</p>
        </div>
      </div>
    );
  }

  if (role !== 'coach' || !user) {
    return (
      <div>
        <PageHeader title="Log New Session" description="Record the details of your latest coaching session." />
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
  
  if (clients.length === 0) {
    return (
      <div>
        <PageHeader title="Log New Session" />
        <Alert>
          <Users className="h-4 w-4" />
          <AlertTitle>No Clients Found</AlertTitle>
          <AlertDescription>
            You do not have any clients assigned to you yet. A client must be assigned before you can log a session. Please contact an administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Pass coachId, coachName, and the list of clients to the form
  return (
    <div>
      <PageHeader title="Log New Session" description="Record the details of your latest coaching session." />
      <div className="mt-8 flex justify-center">
        <SessionLogForm coachId={user.uid} coachName={user.displayName || "Coach"} clients={clients} />
      </div>
    </div>
  );
}
