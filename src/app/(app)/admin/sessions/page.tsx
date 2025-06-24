
'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, DollarSign, Eye, Video, FileText, Loader2, TriangleAlert, XCircle, Archive, RotateCcw } from "lucide-react";
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
import { getAllSessionsForAdmin, updateSession, type Session } from '@/lib/firestoreService';
import { useRole } from '@/context/role-context';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type SessionStatus = 'Under Review' | 'Approved' | 'Denied' | 'Billed';

export default function AdminSessionReviewPage() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { role, userProfile, isLoading: isRoleLoading } = useRole();
  const [firebaseAvailable, setFirebaseAvailable] = useState(false);

  useEffect(() => {
    setFirebaseAvailable(isFirebaseConfigured());
  }, []);

  useEffect(() => {
    if (isRoleLoading || !firebaseAvailable || !userProfile?.companyId) {
      if (!isRoleLoading && (!firebaseAvailable || !userProfile?.companyId)) setIsLoading(false);
      return;
    }

    const companyId = userProfile.companyId;

    if (role === 'admin' || role === 'super-admin') {
      const fetchSessions = async () => {
        setIsLoading(true);
        try {
          const fetchedSessions = await getAllSessionsForAdmin(role, companyId);
          setSessions(fetchedSessions);
        } catch (error) {
          console.error("Failed to fetch sessions for review:", error);
          toast({ title: "Error", description: "Could not load sessions. This may require creating a Firestore index. Check the browser console for a link.", variant: "destructive", duration: 7000 });
        } finally {
          setIsLoading(false);
        }
      };
      fetchSessions();
    } else {
        setSessions([]);
        setIsLoading(false);
    }
  }, [role, isRoleLoading, toast, firebaseAvailable, userProfile?.companyId]);

  const handleUpdateStatus = async (sessionId: string, newStatus: SessionStatus) => {
    if (!firebaseAvailable) {
      toast({ title: "Operation Failed", description: "Firebase is not configured.", variant: "destructive" });
      return;
    }
    try {
      await updateSession(sessionId, { status: newStatus });
      
      // If admin approves, it goes to super-admin, so remove from view.
      // Otherwise, update the status in place.
      if (role === 'admin' && newStatus === 'Approved') {
         setSessions(prevSessions => prevSessions.filter(s => s.id !== sessionId));
         toast({
            title: 'Session Approved',
            description: 'The session has been moved to the billing queue for the Super Admin.',
         });
      } else {
         setSessions(prevSessions => prevSessions.map(s => s.id === sessionId ? { ...s, status: newStatus } : s));
         toast({
          title: `Session ${newStatus}`,
          description: `Session has been marked as ${newStatus.toLowerCase()}.`,
          variant: newStatus === 'Billed' ? "default" : undefined,
        });
      }
    } catch (error) {
      console.error(`Error updating session ${sessionId} to ${newStatus}:`, error);
      toast({ title: "Update Failed", description: "Could not update session status.", variant: "destructive" });
    }
  };

  const handleDismiss = async (sessionId: string) => {
    // Optimistically update the UI for a snappy user experience
    setSessions(prevSessions => prevSessions.filter(s => s.id !== sessionId));
    
    try {
      // Persist the change in Firestore
      await updateSession(sessionId, { isArchived: true });
      toast({
        title: 'Session Dismissed',
        description: 'The session has been archived and removed from your view.',
      });
    } catch (error) {
      console.error(`Error dismissing/archiving session ${sessionId}:`, error);
      toast({ title: "Archive Failed", description: "Could not archive the session. It may reappear on refresh.", variant: "destructive" });
      // In a more complex app, you might want to add the session back to the list here to reflect the failed state
    }
  };
  
  const getStatusBadge = (status: SessionStatus) => {
    switch (status) {
      case 'Under Review':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200"><Clock className="mr-1 h-3 w-3" />Under Review</Badge>;
      case 'Approved':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>;
      case 'Denied':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Denied</Badge>;
      case 'Billed':
        return <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200"><DollarSign className="mr-1 h-3 w-3" />Billed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading || isRoleLoading) {
    return (
      <div>
        <PageHeader title="Session Review" description="Approve submitted sessions and manage billing." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading sessions...</p>
        </div>
      </div>
    );
  }

  if (role !== 'admin' && role !== 'super-admin') {
     return (
      <div>
        <PageHeader title="Session Review" description="Approve submitted sessions and manage billing." />
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
        <PageHeader title="Session Review" description="Approve submitted sessions and manage billing." />
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

  const pageTitle = role === 'super-admin' ? "Billing Review" : "Session Approval";
  const pageDescription = role === 'super-admin' ? "Review approved sessions that are ready for billing." : "Approve or deny newly submitted coaching sessions.";


  return (
    <div>
      <PageHeader title={pageTitle} description={pageDescription} />
      <Card className="shadow-light">
        <CardHeader>
          <CardTitle className="font-headline">
            {role === 'super-admin' ? 'Session Billing Queue' : 'Session Approval Queue'}
          </CardTitle>
          <CardDescription>
             {sessions.length === 0 ? "There are no sessions in this queue." : `Showing ${sessions.length} sessions.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">The queue is empty.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead>Date & Time</TableHead>
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
                    <TableCell>{new Date(session.sessionDate).toLocaleString()}</TableCell>
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
                      
                      {/* Admin Actions */}
                      {role === 'admin' && (
                        <>
                          {session.status === 'Under Review' && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(session.id, 'Approved')} className="hover:border-primary">
                                <CheckCircle className="mr-1 h-4 w-4" /> Approve
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleUpdateStatus(session.id, 'Denied')}>
                                <XCircle className="mr-1 h-4 w-4" /> Deny
                              </Button>
                            </>
                          )}
                          {session.status === 'Denied' && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(session.id, 'Under Review')}>
                                <RotateCcw className="mr-1 h-4 w-4" /> Undo
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDismiss(session.id)}>
                                <Archive className="mr-1 h-4 w-4 text-muted-foreground" /> Dismiss
                              </Button>
                            </>
                          )}
                        </>
                      )}
                      
                      {/* Super Admin Actions */}
                      {role === 'super-admin' && (
                         <>
                          {session.status === 'Approved' && (
                             <Button variant="default" size="sm" onClick={() => handleUpdateStatus(session.id, 'Billed')} className="bg-success hover:bg-success/90 text-success-foreground">
                              <DollarSign className="mr-1 h-4 w-4" /> Bill Client
                            </Button>
                          )}
                          {session.status === 'Billed' && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(session.id, 'Approved')}>
                                <RotateCcw className="mr-1 h-4 w-4" /> Undo Bill
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDismiss(session.id)}>
                                <Archive className="mr-1 h-4 w-4 text-muted-foreground" /> Dismiss
                              </Button>
                            </>
                          )}
                        </>
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
              Total Sessions in Queue: {sessions.length}
            </p>
          </CardFooter>
      </Card>
    </div>
  );
}
