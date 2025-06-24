
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from "@/components/shared/page-header";
import { SessionCard, type Session } from "@/components/shared/session-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ClipboardList, Edit3, ArrowLeft, PlusCircle, Loader2 } from "lucide-react"; 
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getClientSessionsForCoach, getUserProfile, type UserProfile } from '@/lib/firestoreService';
import { isFirebaseConfigured } from '@/lib/firebase';
import { useRole } from '@/context/role-context';

export default function ClientSessionsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile: coachProfile, isLoading: isRoleLoading } = useRole();

  const clientId = params.clientId as string;

  const [client, setClient] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseAvailable, setFirebaseAvailable] = useState(false);

  useEffect(() => {
    setFirebaseAvailable(isFirebaseConfigured());
  }, []);

  useEffect(() => {
    if (isRoleLoading || !clientId || !firebaseAvailable || !coachProfile?.companyId) {
      if (!isRoleLoading && (!firebaseAvailable || !coachProfile?.companyId)) setIsLoading(false);
      return;
    };
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [clientProfile, clientSessions] = await Promise.all([
          getUserProfile(clientId),
          getClientSessionsForCoach(clientId, coachProfile.uid, coachProfile.companyId)
        ]);

        // --- VALIDATION STEP ---
        // A coach can only view this page if the client is assigned to them and they are in the same company.
        if (
          clientProfile &&
          clientProfile.role === 'client' &&
          clientProfile.coachId === coachProfile.uid &&
          clientProfile.companyId === coachProfile.companyId
        ) {
          setClient(clientProfile);
          setSessions(clientSessions);
        } else {
          setClient(null);
          setSessions([]);
        }
        
      } catch (error: any) {
        console.error("Failed to fetch client data:", error);
        toast({ title: "Error", description: error.message || "Could not load client details and sessions.", variant: "destructive" });
        setClient(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [clientId, firebaseAvailable, toast, coachProfile, isRoleLoading]);
  
  const handleEditSession = (sessionId: string) => {
    router.push(`/coach/my-sessions/${sessionId}/edit`);
  };
  
  if (isLoading || isRoleLoading) {
    return (
       <div>
        <PageHeader title="Loading..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading client sessions...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <PageHeader title="Client Not Found" />
        <Card className="w-full max-w-md text-center shadow-light">
          <CardContent className="pt-6">
            <p>The client with ID "{clientId}" could not be found or you do not have permission to view them.</p>
            <Button onClick={() => router.back()} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title={`Sessions for ${client.displayName}`}
        description={`Review and manage sessions logged for ${client.displayName}.`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/coach/my-clients')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Clients
            </Button>
            <Button asChild>
              <Link href={`/coach/log-session?clientId=${clientId}&clientName=${encodeURIComponent(client.displayName)}`}>
                <PlusCircle className="mr-2 h-4 w-4" /> Log New Session
              </Link>
            </Button>
          </div>
        }
      />
      
      {sessions.length === 0 ? (
        <Alert className="shadow-light">
          <ClipboardList className="h-5 w-5" />
          <AlertTitle className="font-headline">No Sessions Logged for {client.displayName}</AlertTitle>
          <AlertDescription>
            Use the "Log New Session" button to record the first session for this client.
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
