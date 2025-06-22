
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Briefcase, Mail, BarChart2, Loader2, TriangleAlert, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRole } from '@/context/role-context';
import { useToast } from '@/hooks/use-toast';
import { isFirebaseConfigured } from '@/lib/firebase';
import { getAllCoaches, getAllSessions, type UserProfile, type Session } from '@/lib/firestoreService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

export default function AdminCoachesPage() {
  const { role, isLoading: isRoleLoading } = useRole();
  const [coaches, setCoaches] = useState<UserProfile[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [firebaseAvailable, setFirebaseAvailable] = useState(false);

  useEffect(() => {
    setFirebaseAvailable(isFirebaseConfigured());
  }, []);

  useEffect(() => {
    if (isRoleLoading || !firebaseAvailable) {
      if (!isRoleLoading && !firebaseAvailable) setIsLoading(false);
      return;
    }

    if (role === 'admin' || role === 'super-admin') {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const [fetchedCoaches, fetchedSessions] = await Promise.all([
            getAllCoaches(),
            getAllSessions()
          ]);
          setCoaches(fetchedCoaches);
          setSessions(fetchedSessions);
        } catch (error: any) {
          console.error("Failed to fetch admin data:", error);
          toast({ title: "Error", description: error.message || "Could not load coaches and sessions.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [role, isRoleLoading, toast, firebaseAvailable]);

  const sessionCounts = useMemo(() => {
    if (sessions.length === 0) return new Map<string, number>();
    return sessions.reduce((acc, session) => {
      if (session.coachId) {
        acc.set(session.coachId, (acc.get(session.coachId) || 0) + 1);
      }
      return acc;
    }, new Map<string, number>());
  }, [sessions]);

  if (isLoading || isRoleLoading) {
    return (
      <div>
        <PageHeader title="Coaches" description="View all coaches and their session statistics." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading coaches data...</p>
        </div>
      </div>
    );
  }

  if (role !== 'admin' && role !== 'super-admin') {
    return (
      <div>
        <PageHeader title="Coaches" />
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
        <PageHeader title="Coaches" description="View all coaches and their session statistics." />
        <Alert variant="destructive" className="shadow-light">
          <TriangleAlert className="h-5 w-5" />
          <AlertTitle className="font-headline">Feature Unavailable</AlertTitle>
          <AlertDescription>
            Firebase is not configured. Coach data cannot be loaded.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Coaches" description="View all coaches and their session statistics." />
      
      {coaches.length === 0 ? (
        <Card className="shadow-light text-center">
          <CardHeader>
            <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <CardTitle className="font-headline">No Coaches Found</CardTitle>
            <CardDescription>
              There are no users with the 'coach' role on the platform yet.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {coaches.map((coach) => {
            const avatarPlaceholder = coach.displayName.split(' ').map(n => n[0]).join('');
            const totalSessions = sessionCounts.get(coach.uid) || 0;
            return (
              <Card key={coach.uid} className="shadow-light hover:shadow-md transition-shadow duration-200 flex flex-col">
                <CardHeader className="items-center text-center">
                  <Avatar className="h-20 w-20 mb-3 border-2 border-primary/50">
                    <AvatarImage 
                      src={coach.photoURL || `https://placehold.co/100x100.png?text=${avatarPlaceholder}`} 
                      alt={coach.displayName}
                      width={100}
                      height={100}
                      className="aspect-square"
                      data-ai-hint="avatar person"
                    />
                    <AvatarFallback>{avatarPlaceholder}</AvatarFallback>
                  </Avatar>
                  <CardTitle className="font-headline text-xl">{coach.displayName}</CardTitle>
                  <CardDescription className="flex items-center justify-center text-xs">
                    <Mail className="mr-1 h-3 w-3" /> {coach.email}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-2 text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <BarChart2 className="mr-2 h-4 w-4 text-primary" />
                    <span>Total Sessions: </span>
                    <Badge variant="secondary" className="ml-auto">{totalSessions}</Badge>
                  </div>
                  {/* Placeholder for more stats */}
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full" variant="outline" disabled>
                    <Link href={`#`}>
                      <Eye className="mr-2 h-4 w-4" /> View Details (Soon)
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
