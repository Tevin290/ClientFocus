
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Users, Eye, BarChart2, Mail, Loader2, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useRole } from '@/context/role-context';
import { getCoachClients, type UserProfile } from '@/lib/firestoreService';
import { useToast } from '@/hooks/use-toast';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function CoachMyClientsPage() {
  const { user, role, isLoading: isRoleLoading } = useRole();
  const [clients, setClients] = useState<UserProfile[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const { toast } = useToast();
  const [firebaseAvailable, setFirebaseAvailable] = useState(false);

  useEffect(() => {
    setFirebaseAvailable(isFirebaseConfigured());
  }, []);

  useEffect(() => {
    if (isRoleLoading || !firebaseAvailable) {
      if (!isRoleLoading && !firebaseAvailable) setIsLoadingClients(false);
      return;
    }

    if (role === 'coach' && user?.uid) {
      const fetchClients = async () => {
        setIsLoadingClients(true);
        try {
          const fetchedClients = await getCoachClients(user.uid);
          setClients(fetchedClients);
        } catch (error: any) {
          console.error("Failed to fetch coach clients:", error);
          toast({ title: "Error", description: error.message || "Could not load your clients.", variant: "destructive" });
        } finally {
          setIsLoadingClients(false);
        }
      };
      fetchClients();
    } else {
      setClients([]);
      setIsLoadingClients(false);
    }
  }, [role, user, isRoleLoading, toast, firebaseAvailable]);

  if (isLoadingClients || isRoleLoading) {
    return (
      <div>
        <PageHeader title="My Clients" description="Manage your clients and view their session history." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading your clients...</p>
        </div>
      </div>
    );
  }
  
  if (role !== 'coach') {
     return (
      <div>
        <PageHeader title="My Clients" />
        <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>You must be a coach to view this page.</AlertDescription>
        </Alert>
      </div>
     );
  }
  
  if (!firebaseAvailable) {
     return (
      <div>
        <PageHeader title="My Clients" description="Manage your clients and view their session history." />
        <Alert variant="destructive" className="shadow-light">
          <TriangleAlert className="h-5 w-5" />
          <AlertTitle className="font-headline">Feature Unavailable</AlertTitle>
          <AlertDescription>
            Firebase is not configured. Client data cannot be loaded.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="My Clients" description="Manage your clients and view their session history." />
      
      {clients.length === 0 ? (
        <Card className="shadow-light text-center">
          <CardHeader>
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <CardTitle className="font-headline">No Clients Yet</CardTitle>
            <CardDescription>
              When clients are assigned to you, they will appear here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clients.map((client) => {
            const avatarPlaceholder = client.displayName.split(' ').map(n => n[0]).join('');
            return (
              <Card key={client.uid} className="shadow-light hover:shadow-md transition-shadow duration-200 flex flex-col">
                <CardHeader className="items-center text-center">
                  <Avatar className="h-20 w-20 mb-3 border-2 border-primary/50">
                    <Image 
                      src={client.photoURL || `https://placehold.co/100x100.png?text=${avatarPlaceholder}`} 
                      alt={client.displayName} 
                      width={100} 
                      height={100} 
                      className="aspect-square"
                      data-ai-hint="avatar person" 
                    />
                    <AvatarFallback>{avatarPlaceholder}</AvatarFallback>
                  </Avatar>
                  <CardTitle className="font-headline text-xl">{client.displayName}</CardTitle>
                  <CardDescription className="flex items-center justify-center text-xs">
                    <Mail className="mr-1 h-3 w-3" /> {client.email}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-2 text-sm">
                   {/* Placeholder for real stats */}
                  <div className="flex items-center text-muted-foreground">
                    <BarChart2 className="mr-2 h-4 w-4 text-primary" />
                    <span>Total Sessions: </span>
                    <Badge variant="secondary" className="ml-auto">N/A</Badge>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={`/coach/my-clients/${client.uid}/sessions`}>
                      <Eye className="mr-2 h-4 w-4" /> View Sessions
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  );
}
