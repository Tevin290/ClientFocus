
'use client'; 

import React, { useState, useEffect } from 'react';
import { PageHeader } from "@/components/shared/page-header";
import { SessionCard, type Session } from "@/components/shared/session-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { History, Loader2 } from "lucide-react";
import { useRole } from '@/context/role-context'; // To get current user for fetching data
import { getClientSessions } from '@/lib/firestoreService'; // Import the service

export default function ClientHistoryPage() {
  const { role, user } = useRole(); // Assuming useRole context might provide the authenticated user object
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (role === 'client' && user?.uid) { // Ensure user is a client and UID is available
      const fetchSessions = async () => {
        setIsLoading(true);
        try {
          // Replace with actual Firebase user ID from auth context
          // For now, using a placeholder or assuming user.uid exists from context
          const fetchedSessions = await getClientSessions(user.uid); 
          setSessions(fetchedSessions);
        } catch (error) {
          console.error("Failed to fetch client sessions:", error);
          // Handle error (e.g., show toast)
        } finally {
          setIsLoading(false);
        }
      };
      fetchSessions();
    } else if (role !== 'client') {
      // Handle cases where a non-client tries to access this page, or user is not available
      setIsLoading(false);
      setSessions([]); // Clear sessions if not applicable
    } else {
        // If user.uid is not yet available but role is client, keep loading or use mock
        // For demonstration, falling back to mock if user.uid isn't ready
        // In a real app, you'd ensure user object is loaded from context before fetching
        const loadMock = async () => {
             const mockData = await getClientSessions("mock-client-id"); // fallback
             setSessions(mockData);
             setIsLoading(false);
        }
        loadMock();
    }
  }, [role, user]); // Add user to dependency array

  if (isLoading) {
    return (
      <div>
        <PageHeader title="My Session History" description="Review your past coaching sessions, notes, and recordings." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading your sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="My Session History" description="Review your past coaching sessions, notes, and recordings." />
      
      {sessions.length === 0 ? (
        <Alert className="shadow-light">
          <History className="h-5 w-5" />
          <AlertTitle className="font-headline">No Sessions Yet!</AlertTitle>
          <AlertDescription>
            Your past coaching sessions will appear here once they are logged by your coach.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <SessionCard 
              key={session.id} 
              session={session}
            />
          ))}
        </div>
      )}
    </div>
  );
}
