
'use client'; 

import React from 'react';
import { PageHeader } from "@/components/shared/page-header";
import { SessionCard, type Session } from "@/components/shared/session-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { History } from "lucide-react";

// Mock data for client's session history
const mockClientSessions: Session[] = [
  { 
    id: 'c1', 
    coachName: 'Dr. John Doe', 
    sessionDate: '2024-07-15', 
    sessionType: 'Full', 
    summary: 'We discussed your progress on project milestones and brainstormed strategies for overcoming recent obstacles. Key actions include A, B, and C.',
    videoLink: 'https://example.com/recording1',
  },
  { 
    id: 'c2', 
    coachName: 'Jane Smith', 
    sessionDate: '2024-06-20', 
    sessionType: 'Half', 
    summary: 'Quick check-in on time management. Reviewed weekly planner and identified areas for improvement.',
  },
  { 
    id: 'c3', 
    coachName: 'Dr. John Doe', 
    sessionDate: '2024-05-10', 
    sessionType: 'Full', 
    summary: 'Deep dive into Q2 goals. Set clear objectives and established a timeline for deliverables. Client felt positive about the direction.',
    videoLink: 'https://example.com/recording2',
  },
];

export default function ClientHistoryPage() {
  const handleViewDetails = (session: Session) => {
    // In a real app, this might open a modal or navigate to a detailed session view
    alert(`Viewing details for session on ${new Date(session.sessionDate).toLocaleDateString()}`);
  };

  return (
    <div>
      <PageHeader title="My Session History" description="Review your past coaching sessions, notes, and recordings." />
      
      {mockClientSessions.length === 0 ? (
        <Alert className="shadow-light">
          <History className="h-5 w-5" />
          <AlertTitle className="font-headline">No Sessions Yet!</AlertTitle>
          <AlertDescription>
            Your past coaching sessions will appear here once they are logged.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mockClientSessions.map((session) => (
            <SessionCard 
              key={session.id} 
              session={session} 
              // showActions={true} // Enable if you have a details view/modal
              // onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
}
