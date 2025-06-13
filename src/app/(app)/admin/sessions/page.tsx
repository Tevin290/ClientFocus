
'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, DollarSign, Eye, Video, FileText, Loader2, TriangleAlert } from "lucide-react";
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
import { getAllSessionsForAdmin, updateSession, type Session } from '@/lib/firestoreService'; // Import real service
import { useRole } from '@/context/role-context';
import { isFirebaseConfigured } from '@/lib/firebase';

type SessionStatus = 'Logged' | 'Reviewed' | 'Billed';
// Session type is already imported from firestoreService

export default function AdminSessionReviewPage() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { role, isLoading: isRoleLoading } = useRole();
  const [firebaseAvailable, setFirebaseAvailable] = useState(false);

  useEffect(() => {
    setFirebaseAvailable(isFirebaseConfigured());
  }, []);

  useEffect(() => {
    if (isRoleLoading || !firebaseAvailable) {
      if (!isRoleLoading && !firebaseAvailable) setIsLoading(false);
      return;
    }

    if (role === 'admin') {
      const fetchSessions = async () => {
        setIsLoading(true);
        try {
          const fetchedSessions = await getAllSessionsForAdmin();
          setSessions(fetchedSessions);
        } catch (error) {
          console.error("Failed to fetch sessions for admin:", error);
          toast({ title: "Error", description: "Could not load sessions.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      fetchSessions();
    } else {
        setSessions([]);
        setIsLoading(false);
    }
  }, [role, isRoleLoading, toast, firebaseAvailable]);

  const handleUpdateStatus = async (sessionId: string, newStatus: SessionStatus) => {
    if (!firebaseAvailable) {
      toast({ title: "Operation Failed", description: "Firebase is not configured.", variant: "destructive" });
      return;
    }
    try {
      await updateSession(sessionId, { status: newStatus });
      setSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === sessionId ? { ...session, status: newStatus } : session
        )
      );
      toast({
        title: `Session ${newStatus}`,
        description: `Session ${sessionId} has been marked as ${newStatus.toLowerCase()}.`,
        variant: newStatus === 'Billed' ? "default" : undefined, // 'default' for success, undefined for others
      });
    } catch (error) {
      console.error(`Error updating session ${sessionId} to ${newStatus}:`, error);
      toast({ title: "Update Failed", description: "Could not update session status.", variant: "destructive" });
    }
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

  if (isLoading || isRoleLoading) {
    return (
      <div>
        <PageHeader title="Session Review" description="Review submitted sessions and manage billing." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading sessions...</p>
        </div>
      </div>
    );
  }

  if (role !== 'admin') {
     return (
      <div>
        <PageHeader title="Session Review" description="Review submitted sessions and manage billing." />
        <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>You must be an admin to view this page.</AlertDescription>
        </Alert>
      </div>
     );
  }

  if (!firebaseAvailable) {
     return (
      <div>
        <PageHeader title="Session Review" description="Review submitted sessions and manage billing." />
        <Alert variant="destructive" className="shadow-light">
          <TriangleAlert className="h-5 w-5" />
          <AlertTitle className="font-headline">Feature Unavailable</AlertTitle>
          <AlertDescription>
            Firebase is not configured. Session data cannot be loaded. Please contact support or the administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }


  return (
    <div>
      <PageHeader title="Session Review" description="Review submitted sessions and manage billing." />
      <Card className="shadow-light">
        <CardHeader>
          <CardTitle className="font-headline">Submitted Sessions</CardTitle>
          <CardDescription>Awaiting review or billing.</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No sessions found.</p>
          ) : (
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
                    <TableCell>{getStatusBadge(session.status as SessionStatus)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {session.videoLink && (
                        <Button variant="outline" size="sm" asChild className="hover:border-primary">
                          <a href={session.videoLink} target="_blank" rel="noopener noreferrer" aria-label="View Video">
                            <Video className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => alert(`Notes for ${session.clientName}:\n${session.notes || session.summary || 'No notes available.'}`)} className="hover:border-primary" aria-label="View Notes">
                        <FileText className="h-4 w-4" />
                      </Button>
                      {session.status === 'Logged' && (
                        <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(session.id, 'Reviewed')} className="hover:border-primary">
                          <Eye className="mr-1 h-4 w-4" /> Review
                        </Button>
                      )}
                      {session.status === 'Reviewed' && (
                        <Button variant="default" size="sm" onClick={() => handleUpdateStatus(session.id, 'Billed')} className="bg-success hover:bg-success/90 text-success-foreground">
                          <DollarSign className="mr-1 h-4 w-4" /> Bill
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
