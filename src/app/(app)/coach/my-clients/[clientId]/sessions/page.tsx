
'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from "@/components/shared/page-header";
import { SessionCard, type Session } from "@/components/shared/session-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ClipboardList, Edit3, ArrowLeft, PlusCircle } from "lucide-react"; 
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Mock data - In a real app, this would come from a data source based on clientId
// This should ideally be the same source as CoachMySessionsPage, filtered here.
const allCoachSessions: Array<Session & { clientId: string; coachName?: string }> = [
   { 
    id: 'coach_s1', 
    clientId: 'client_1',
    clientName: 'Alice Wonderland', 
    coachName: 'Current Coach', // Assuming current coach
    sessionDate: '2024-07-20', 
    sessionType: 'Full', 
    summary: 'Focused on goal setting and weekly planning. Alice is making good progress towards her Q3 objectives. Key actions: Finalize project proposal, schedule stakeholder meeting.',
    videoLink: 'https://example.com/recording_coach_alice',
    status: 'Logged', 
  },
  { 
    id: 'coach_s2', 
    clientId: 'client_2',
    clientName: 'Bob The Builder', 
    coachName: 'Current Coach',
    sessionDate: '2024-07-18', 
    sessionType: 'Half', 
    summary: 'Quick check-in on project deliverables. Discussed time management for next week and Bob identified two key areas for improvement in his workflow.',
    status: 'Logged',
  },
  { 
    id: 'coach_s3', 
    clientId: 'client_1', 
    clientName: 'Alice Wonderland',
    coachName: 'Current Coach',
    sessionDate: '2024-07-10', 
    sessionType: 'Half', 
    summary: 'Follow-up on stakeholder meeting. Discussed feedback and next steps for proposal refinement.',
    status: 'Logged',
  },
  { 
    id: 'coach_s4', 
    clientId: 'client_3',
    clientName: 'Charlie Brown', 
    coachName: 'Current Coach',
    sessionDate: '2024-07-15', 
    sessionType: 'Full', 
    summary: 'Reviewed progress on overcoming communication challenges. Role-played difficult conversations. Charlie feels more confident.',
    videoLink: 'https://example.com/recording_coach_charlie',
    status: 'Logged',
  },
   { 
    id: 'coach_s5', 
    clientId: 'client_1', // Alice's third session
    clientName: 'Alice Wonderland', 
    coachName: 'Current Coach',
    sessionDate: '2024-06-25', 
    sessionType: 'Full', 
    summary: 'Initial goal discovery and onboarding. Established rapport and set expectations for coaching engagement.',
    status: 'Logged',
  },
];

// Mock client data to get client name if not available in session (though session should have it)
const mockClients = [
  { id: 'client_1', name: 'Alice Wonderland' },
  { id: 'client_2', name: 'Bob The Builder' },
  { id: 'client_3', name: 'Charlie Brown' },
  { id: 'client_4', name: 'Diana Prince' },
];


export default function ClientSessionsPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;

  const client = mockClients.find(c => c.id === clientId);
  const clientSessions = allCoachSessions.filter(session => session.clientId === clientId);

  const handleEditSession = (sessionId: string) => {
    alert(`Navigating to edit session: ${sessionId} for client ${client?.name}`);
    // Potentially router.push(`/coach/edit-session/${sessionId}?clientId=${clientId}`);
  };

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <PageHeader title="Client Not Found" />
        <Card className="w-full max-w-md text-center shadow-light">
          <CardContent className="pt-6">
            <p>The client with ID "{clientId}" could not be found.</p>
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
        title={`Sessions for ${client.name}`}
        description={`Review and manage sessions logged for ${client.name}.`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/coach/my-clients')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Clients
            </Button>
            <Button asChild>
              <Link href={`/coach/log-session?clientId=${clientId}&clientName=${encodeURIComponent(client.name)}`}>
                <PlusCircle className="mr-2 h-4 w-4" /> Log New Session
              </Link>
            </Button>
          </div>
        }
      />
      
      {clientSessions.length === 0 ? (
        <Alert className="shadow-light">
          <ClipboardList className="h-5 w-5" />
          <AlertTitle className="font-headline">No Sessions Logged for {client.name}</AlertTitle>
          <AlertDescription>
            Use the "Log New Session" button to record the first session for this client.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {clientSessions.map((session) => (
            <div key={session.id} className="flex flex-col">
              <SessionCard 
                session={{
                    ...session,
                    // clientName can be omitted here if header already states client name
                    // but SessionCard expects it, so we ensure it's passed.
                }}
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
