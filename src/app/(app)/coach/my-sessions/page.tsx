
'use client';

import React from 'react';
import { PageHeader } from "@/components/shared/page-header";
import { SessionCard, type Session } from "@/components/shared/session-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ClipboardList, Edit3 } from "lucide-react"; // Using ClipboardList for the "no sessions" icon
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Mock data for coach's logged sessions
const mockCoachSessions: Session[] = [
  { 
    id: 'coach_s1', 
    clientName: 'Alice Wonderland', 
    sessionDate: '2024-07-20', 
    sessionType: 'Full', 
    summary: 'Focused on goal setting and weekly planning. Alice is making good progress towards her Q3 objectives. Key actions: Finalize project proposal, schedule stakeholder meeting.',
    videoLink: 'https://example.com/recording_coach_alice',
    status: 'Logged', // Status from coach's perspective
  },
  { 
    id: 'coach_s2', 
    clientName: 'Bob The Builder', 
    sessionDate: '2024-07-18', 
    sessionType: 'Half', 
    summary: 'Quick check-in on project deliverables. Discussed time management for next week and Bob identified two key areas for improvement in his workflow.',
    status: 'Logged',
  },
  { 
    id: 'coach_s3', 
    clientName: 'Charlie Brown', 
    sessionDate: '2024-07-15', 
    sessionType: 'Full', 
    summary: 'Reviewed progress on overcoming communication challenges. Role-played difficult conversations. Charlie feels more confident.',
    videoLink: 'https://example.com/recording_coach_charlie',
    status: 'Logged',
  },
];

export default function CoachMySessionsPage() {
  const handleEditSession = (sessionId: string) => {
    // In a real app, this would navigate to an edit page for the session
    alert(`Navigating to edit session: ${sessionId}`);
    // router.push(`/coach/edit-session/${sessionId}`);
  };

  return (
    <div>
      <PageHeader 
        title="My Logged Sessions" 
        description="Review and manage your past coaching sessions."
        actions={
          <Button asChild>
            <Link href="/coach/log-session">Log New Session</Link>
          </Button>
        }
      />
      
      {mockCoachSessions.length === 0 ? (
        <Alert className="shadow-light">
          <ClipboardList className="h-5 w-5" />
          <AlertTitle className="font-headline">No Sessions Logged Yet!</AlertTitle>
          <AlertDescription>
            Your logged coaching sessions will appear here. <Link href="/coach/log-session" className="text-primary hover:underline">Log your first session now.</Link>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mockCoachSessions.map((session) => (
            <div key={session.id} className="flex flex-col">
              <SessionCard 
                session={session}
                // coachName is not needed here as it's the coach's own view
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
