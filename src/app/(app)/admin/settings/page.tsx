
'use client';

import React, { useState } from 'react';
import { PageHeader } from "@/components/shared/page-header";
import { StripeSettingsForm } from "@/components/forms/stripe-settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Loader2, TriangleAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateDummyData } from '@/lib/dummyDataService'; // Import the new service
import { useRole } from '@/context/role-context';
import { Alert, AlertDescription, AlertTitle as UiAlertTitle } from '@/components/ui/alert'; // Renamed to avoid conflict
import { isFirebaseConfigured } from '@/lib/firebase';


export default function AdminSettingsPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { role, isLoading: isRoleLoading } = useRole();
  const [firebaseAvailable, setFirebaseAvailable] = useState(false);

  React.useEffect(() => {
    setFirebaseAvailable(isFirebaseConfigured());
  }, []);

  const handleGenerateData = async () => {
    if (!firebaseAvailable) {
      toast({ title: "Operation Failed", description: "Firebase is not configured. Cannot generate data.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateDummyData();
      toast({
        title: "Dummy Data Generation Complete",
        description: `${result.usersCreated} users and ${result.sessionsCreated} sessions created. Check Firebase console.`,
        duration: 7000,
      });
    } catch (error: any) {
      console.error("Error generating dummy data:", error);
      toast({
        title: "Dummy Data Generation Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isRoleLoading) {
     return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (role !== 'admin') {
    return (
      <div>
        <PageHeader title="Application Settings" description="Manage integrations and platform configurations."/>
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <UiAlertTitle>Access Denied</UiAlertTitle>
          <AlertDescription>You must be an admin to view settings.</AlertDescription>
        </Alert>
      </div>
    );
  }


  return (
    <div>
      <PageHeader title="Application Settings" description="Manage integrations and platform configurations."/>
      <div className="space-y-8 mt-8">
        <StripeSettingsForm />

        <Card className="shadow-light">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <Database className="mr-2 h-5 w-5 text-primary" />
              Developer Tools
            </CardTitle>
            <CardDescription>Actions for development and testing purposes.</CardDescription>
          </CardHeader>
          <CardContent>
            {!firebaseAvailable && (
               <Alert variant="destructive" className="mb-4">
                  <TriangleAlert className="h-4 w-4" />
                  <UiAlertTitle>Firebase Not Configured</UiAlertTitle>
                  <AlertDescription>Dummy data generation is disabled because Firebase is not configured in `src/lib/firebase.ts`.</AlertDescription>
              </Alert>
            )}
            <p className="text-sm text-muted-foreground mb-4">
              Use this button to populate your Firestore database with sample users and sessions.
              This is useful for testing features without manual data entry.
              Ensure you have created corresponding users in Firebase Authentication first
              (e.g., admin@example.com, coach@example.com, client@example.com with password 'password123').
            </p>
            <Button 
              onClick={handleGenerateData} 
              disabled={isGenerating || !firebaseAvailable}
              variant="outline"
              className="hover:border-primary"
            >
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Database className="mr-2 h-4 w-4" />
              )}
              Generate Dummy Firestore Data
            </Button>
            {isGenerating && <p className="text-sm text-primary mt-2">Generating data, please wait...</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
