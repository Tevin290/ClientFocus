'use client';

import React, { useState } from 'react';
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, DollarSign, Eye, Video, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';

type SessionStatus = 'Logged' | 'Reviewed' | 'Billed';
interface Session {
  id: string;
  clientName: string;
  coachName: string;
  sessionDate: string;
  sessionType: 'Full' | 'Half';
  status: SessionStatus;
  notesSummary: string;
  videoLink?: string;
}

const mockSessions: Session[] = [
  { id: '1', clientName: 'Alice Wonderland', coachName: 'Dr. John Doe', sessionDate: '2024-07-15', sessionType: 'Full', status: 'Logged', notesSummary: 'Discussed progress on goals A and B. New strategies for C.', videoLink: 'https://example.com/video1' },
  { id: '2', clientName: 'Bob The Builder', coachName: 'Jane Smith', sessionDate: '2024-07-16', sessionType: 'Half', status: 'Reviewed', notesSummary: 'Focused on time management techniques.', videoLink: 'https://example.com/video2' },
  { id: '3', clientName: 'Charlie Brown', coachName: 'Dr. John Doe', sessionDate: '2024-07-17', sessionType: 'Full', status: 'Billed', notesSummary: 'Reviewed Q2 objectives and set Q3 targets.', videoLink: 'https://example.com/video3' },
  { id: '4', clientName: 'Diana Prince', coachName: 'Dr. Eva Green', sessionDate: '2024-07-18', sessionType: 'Full', status: 'Logged', notesSummary: 'Explored leadership challenges and communication styles.', videoLink: 'https://example.com/video4' },
];


export default function AdminSessionReviewPage() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>(mockSessions);

  const handleInitiateBilling = (sessionId: string) => {
    setSessions(prevSessions => 
      prevSessions.map(session => 
        session.id === sessionId ? { ...session, status: 'Billed' } : session
      )
    );
    toast({
      title: "Billing Initiated",
      description: `Billing process started for session ${sessionId}.`,
      variant: "default", // or custom success variant
    });
  };

  const handleMarkAsReviewed = (sessionId: string) => {
    setSessions(prevSessions => 
      prevSessions.map(session => 
        session.id === sessionId ? { ...session, status: 'Reviewed' } : session
      )
    );
    toast({
      title: "Session Reviewed",
      description: `Session ${sessionId} marked as reviewed.`,
    });
  };
  
  const getStatusBadge = (status: SessionStatus) => {
    switch (status) {
      case 'Logged':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200"><Clock className="mr-1 h-3 w-3" />Logged</Badge>;
      case 'Reviewed':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200"><Eye className="mr-1 h-3 w-3" />Reviewed</Badge>;
      case 'Billed':
        return <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200"><CheckCircle className="mr-1 h-3 w-3" />Billed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };


  return (
    <div>
      <PageHeader title="Session Review" description="Review submitted sessions and manage billing." />
      <Card className="shadow-light">
        <CardHeader>
          <CardTitle className="font-headline">Submitted Sessions</CardTitle>
          <CardDescription>Awaiting review or billing.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Coach</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.clientName}</TableCell>
                  <TableCell>{session.coachName}</TableCell>
                  <TableCell>{new Date(session.sessionDate).toLocaleDateString()}</TableCell>
                  <TableCell>{session.sessionType}</TableCell>
                  <TableCell>{getStatusBadge(session.status)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {session.videoLink && (
                      <Button variant="outline" size="sm" asChild className="hover:border-primary">
                        <a href={session.videoLink} target="_blank" rel="noopener noreferrer" aria-label="View Video">
                          <Video className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                     <Button variant="outline" size="sm" onClick={() => alert(`Notes for ${session.clientName}:\n${session.notesSummary}`)} className="hover:border-primary" aria-label="View Notes">
                       <FileText className="h-4 w-4" />
                     </Button>
                    {session.status === 'Logged' && (
                      <Button variant="outline" size="sm" onClick={() => handleMarkAsReviewed(session.id)} className="hover:border-primary">
                        <Eye className="mr-1 h-4 w-4" /> Review
                      </Button>
                    )}
                    {session.status === 'Reviewed' && (
                      <Button variant="default" size="sm" onClick={() => handleInitiateBilling(session.id)} className="bg-success hover:bg-success/90 text-success-foreground">
                        <DollarSign className="mr-1 h-4 w-4" /> Bill
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
         <CardFooter>
            <p className="text-xs text-muted-foreground">
              Total Sessions: {sessions.length}
            </p>
          </CardFooter>
      </Card>
    </div>
  );
}
