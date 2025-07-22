/* eslint-disable react/no-unescaped-entities */

'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, DollarSign, Video, FileText, Loader2, TriangleAlert, XCircle, Archive, RotateCcw, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { getAllSessionsForAdmin, updateSession, type Session } from '@/lib/firestoreService';
import { useRole } from '@/context/role-context';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle as UiAlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { getStripeMode } from '@/lib/stripeClient';
import { chargeSessionToClient, formatCurrency } from '@/lib/billingService';
import { BillingConfirmationDialog } from '@/components/billing/billing-confirmation-dialog';

type SessionStatus = 'Under Review' | 'Approved' | 'Denied' | 'Billed';

export default function AdminSessionReviewPage() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { role, userProfile, companyProfile, isLoading: isRoleLoading } = useRole();
  const [firebaseAvailable, setFirebaseAvailable] = useState(false);
  const [showStripePrompt, setShowStripePrompt] = useState(false);
  const [stripeMode, setStripeMode] = useState<'test' | 'live'>('test');
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  const [sessionToBill, setSessionToBill] = useState<Session | null>(null);
  const [isBillingInProgress, setIsBillingInProgress] = useState(false);

  useEffect(() => {
    setFirebaseAvailable(isFirebaseConfigured());
    setStripeMode(getStripeMode());
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

    const isStripeOnboarded = stripeMode === 'test' ? companyProfile?.stripeAccountOnboarded_test : companyProfile?.stripeAccountOnboarded_live;

    if (newStatus === 'Billed' && !isStripeOnboarded) {
      setShowStripePrompt(true);
      return;
    }

    // Special handling for billing
    if (newStatus === 'Billed') {
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        setSessionToBill(session);
        setShowBillingDialog(true);
        return;
      }
    }

    try {
      await updateSession(sessionId, { status: newStatus });
      
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

  const handleBillingConfirm = async () => {
    if (!sessionToBill || !userProfile?.companyId) return;

    setIsBillingInProgress(true);

    try {
      const result = await chargeSessionToClient(
        sessionToBill.id,
        userProfile.companyId,
        stripeMode
      );

      if (result.success) {
        // Update local state
        setSessions(prevSessions => 
          prevSessions.map(s => 
            s.id === sessionToBill.id ? { ...s, status: 'Billed' as SessionStatus } : s
          )
        );

        const formattedAmount = result.amountCharged && result.currency 
          ? formatCurrency(result.amountCharged, result.currency)
          : 'Unknown amount';

        toast({
          title: 'Payment Successful',
          description: `${sessionToBill.clientName} has been charged ${formattedAmount} for ${result.sessionType}.`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Billing Failed',
          description: result.error || 'Unable to process payment. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Billing error:', error);
      toast({
        title: 'Billing Error',
        description: 'An unexpected error occurred while processing the payment.',
        variant: 'destructive',
      });
    } finally {
      setIsBillingInProgress(false);
      setShowBillingDialog(false);
      setSessionToBill(null);
    }
  };

  const handleBillingCancel = () => {
    setShowBillingDialog(false);
    setSessionToBill(null);
  };

  const handleDismiss = async (sessionId: string) => {
    setSessions(prevSessions => prevSessions.filter(s => s.id !== sessionId));
    
    try {
      await updateSession(sessionId, { isArchived: true });
      toast({
        title: 'Session Dismissed',
        description: 'The session has been archived and removed from your view.',
      });
    } catch (error) {
      console.error(`Error dismissing/archiving session ${sessionId}:`, error);
      toast({ title: "Archive Failed", description: "Could not archive the session. It may reappear on refresh.", variant: "destructive" });
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
            <UiAlertTitle>Access Denied</UiAlertTitle>
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
          <UiAlertTitle className="font-headline">Feature Unavailable</UiAlertTitle>
          <AlertDescription>
            Firebase is not configured. Session data cannot be loaded. Please contact support or the administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const pageTitle = role === 'super-admin' ? "Billing Review" : "Session Approval";
  const pageDescription = role === 'super-admin' ? `Review approved sessions that are ready for billing in ${stripeMode} mode.` : "Approve or deny newly submitted coaching sessions.";


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
      
      <AlertDialog open={showStripePrompt} onOpenChange={setShowStripePrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert className="h-5 w-5 text-yellow-500"/>
              Stripe Account Not Ready
            </AlertDialogTitle>
            <AlertDialogDescription>
              To bill clients in {stripeMode} mode, you must first connect and fully onboard your company's Stripe account for that mode. Please go to the billing settings to complete this step.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link href="/admin/billing">
                <Building className="mr-2 h-4 w-4" />
                Go to Billing Settings
              </Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BillingConfirmationDialog
        isOpen={showBillingDialog}
        onClose={handleBillingCancel}
        onConfirm={handleBillingConfirm}
        session={sessionToBill}
        isProcessing={isBillingInProgress}
      />

    </div>
  );
}
