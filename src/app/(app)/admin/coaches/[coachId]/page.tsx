
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Briefcase, Mail, BarChart2, Loader2, TriangleAlert, Eye, ArrowLeft, Users, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRole } from '@/context/role-context';
import { useToast } from '@/hooks/use-toast';
import { isFirebaseConfigured } from '@/lib/firebase';
import { getUserProfile, getCoachClients, getCoachSessions, type UserProfile, type Session } from '@/lib/firestoreService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';

export default function AdminCoachDetailsPage() {
  const params = useParams();
  const coachId = params.coachId as string;
  const router = useRouter();

  const { role, userProfile, isLoading: isRoleLoading } = useRole();
  const [coach, setCoach] = useState<UserProfile | null>(null);
  const [clients, setClients] = useState<UserProfile[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [firebaseAvailable, setFirebaseAvailable] = useState(false);

  useEffect(() => {
    setFirebaseAvailable(isFirebaseConfigured());
  }, []);

  useEffect(() => {
    if (isRoleLoading || !firebaseAvailable || !coachId || !userProfile?.companyId) {
      if (!isRoleLoading && (!firebaseAvailable || !userProfile?.companyId)) setIsLoading(false);
      return;
    }

    const companyId = userProfile.companyId;

    if (role === 'admin' || role === 'super-admin') {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          // All fetches are now scoped to the admin's company
          const [fetchedCoach, fetchedClients, fetchedSessions] = await Promise.all([
            getUserProfile(coachId),
            getCoachClients(coachId, companyId),
            getCoachSessions(coachId, companyId)
          ]);

          // Verify the coach belongs to the admin's company
          if(fetchedCoach?.role !== 'coach' || fetchedCoach?.companyId !== companyId){
             toast({ title: "Not a Valid Coach", description: "The user you are trying to view is not a coach within your company.", variant: "destructive" });
             setCoach(null);
          } else {
             setCoach(fetchedCoach);
          }
          setClients(fetchedClients);
          setSessions(fetchedSessions);
        } catch (error: any) {
          console.error("Failed to fetch coach details:", error);
          toast({ title: "Error", description: error.message || "Could not load coach details.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [role, isRoleLoading, toast, firebaseAvailable, coachId, userProfile?.companyId]);

  const avatarPlaceholder = useMemo(() => {
    return coach?.displayName.split(' ').map(n => n[0]).join('') || 'C';
  }, [coach]);
  
  const totalSessions = sessions.length;
  const totalClients = clients.length;

  if (isLoading || isRoleLoading) {
    return (
      <div>
        <PageHeader title="Loading Coach Details..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (role !== 'admin' && role !== 'super-admin') {
    return (
      <div>
        <PageHeader title="Coach Details" />
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You must be an admin to view this page.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!coach) {
    return (
      <div>
        <PageHeader title="Coach Not Found" />
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Could Not Load Coach</AlertTitle>
          <AlertDescription>
            The coach with ID "{coachId}" could not be found or is not a coach in your company.
            <Button variant="link" onClick={() => router.back()} className="p-0 h-auto ml-1">Go Back</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={coach.displayName}
        description={`Detailed overview for coach ${coach.email}`}
        actions={
          <Button variant="outline" onClick={() => router.push('/admin/coaches')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Coaches
          </Button>
        }
      />
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column for Profile & Stats */}
        <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-light">
                <CardHeader className="items-center text-center">
                  <Avatar className="h-24 w-24 mb-3 border-4 border-primary/50">
                    <AvatarImage 
                      src={coach.photoURL || `https://placehold.co/128x128.png?text=${avatarPlaceholder}`} 
                      alt={coach.displayName}
                      width={128}
                      height={128}
                      className="aspect-square"
                      data-ai-hint="avatar person"
                    />
                    <AvatarFallback>{avatarPlaceholder}</AvatarFallback>
                  </Avatar>
                  <CardTitle className="font-headline text-2xl">{coach.displayName}</CardTitle>
                  <CardDescription className="flex items-center justify-center text-sm">
                    <Mail className="mr-1 h-4 w-4" /> {coach.email}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-t pt-4 flex justify-around text-center">
                    <div>
                        <p className="text-2xl font-bold font-headline">{totalSessions}</p>
                        <p className="text-sm text-muted-foreground">Total Sessions</p>
                    </div>
                     <div>
                        <p className="text-2xl font-bold font-headline">{totalClients}</p>
                        <p className="text-sm text-muted-foreground">Assigned Clients</p>
                    </div>
                  </div>
                </CardContent>
            </Card>

             <Card className="shadow-light">
              <CardHeader>
                <CardTitle className="font-headline flex items-center">
                    <Users className="mr-2 h-5 w-5 text-primary" />
                    Assigned Clients
                </CardTitle>
                 <CardDescription>
                    {clients.length > 0 ? `This coach is assigned to ${clients.length} client(s).` : "This coach has no assigned clients."}
                 </CardDescription>
              </CardHeader>
              <CardContent>
                {clients.length > 0 ? (
                    <ul className="space-y-3">
                        {clients.map(client => (
                            <li key={client.uid} className="flex items-center gap-3">
                               <Avatar className="h-9 w-9 border">
                                 <AvatarImage 
                                    src={client.photoURL || undefined}
                                    alt={client.displayName}
                                    data-ai-hint="avatar person"
                                  />
                                  <AvatarFallback>{client.displayName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                               </Avatar>
                               <div>
                                  <p className="font-medium">{client.displayName}</p>
                                  <p className="text-xs text-muted-foreground">{client.email}</p>
                               </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No clients found.</p>
                )}
              </CardContent>
            </Card>
        </div>

        {/* Right column for Sessions Table */}
        <div className="lg:col-span-2">
            <Card className="shadow-light">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center">
                        <ClipboardList className="mr-2 h-5 w-5 text-primary" />
                        All Logged Sessions
                    </CardTitle>
                    <CardDescription>
                       A complete history of all sessions logged by {coach.displayName}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {sessions.length > 0 ? (
                         <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Client</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessions.map((session) => (
                                <TableRow key={session.id}>
                                    <TableCell className="font-medium">{session.clientName}</TableCell>
                                    <TableCell>{format(new Date(session.sessionDate), "PPp")}</TableCell>
                                    <TableCell><Badge variant={session.sessionType === 'Full' ? 'default' : 'secondary'}>{session.sessionType}</Badge></TableCell>
                                    <TableCell><Badge variant="outline">{session.status}</Badge></TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">This coach has not logged any sessions yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
