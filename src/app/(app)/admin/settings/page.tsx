
'use client';

import React, { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from "@/components/shared/page-header";
import { StripeSettingsForm } from "@/components/forms/stripe-settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Loader2, TriangleAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateDummyDataForCoach } from '@/lib/dummyDataService';
import { getAllCoaches, type UserProfile } from '@/lib/firestoreService';
import { useRole } from '@/context/role-context';
import { Alert, AlertDescription, AlertTitle as UiAlertTitle } from '@/components/ui/alert';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const selectCoachSchema = z.object({
  coachId: z.string().min(1, 'Please select a coach.'),
});

type SelectCoachFormValues = z.infer<typeof selectCoachSchema>;

export default function AdminSettingsPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [coaches, setCoaches] = useState<UserProfile[]>([]);
  const [isFetchingCoaches, setIsFetchingCoaches] = useState(true);
  const { toast } = useToast();
  const { role, isLoading: isRoleLoading } = useRole();
  const [firebaseAvailable, setFirebaseAvailable] = useState(false);

  useEffect(() => {
    setFirebaseAvailable(isFirebaseConfigured());
  }, []);

  const form = useForm<SelectCoachFormValues>({
    resolver: zodResolver(selectCoachSchema),
  });

  useEffect(() => {
    if (!firebaseAvailable || role !== 'admin') {
      setIsFetchingCoaches(false);
      return;
    }
    const fetchCoaches = async () => {
      setIsFetchingCoaches(true);
      try {
        const fetchedCoaches = await getAllCoaches();
        setCoaches(fetchedCoaches);
      } catch (error) {
        console.error("Failed to fetch coaches:", error);
        toast({ title: "Error", description: "Could not load the list of coaches.", variant: "destructive" });
      } finally {
        setIsFetchingCoaches(false);
      }
    };
    fetchCoaches();
  }, [firebaseAvailable, role, toast]);

  const handleGenerateData: SubmitHandler<SelectCoachFormValues> = async (data) => {
    if (!firebaseAvailable) {
      toast({ title: "Operation Failed", description: "Firebase is not configured. Cannot generate data.", variant: "destructive" });
      return;
    }

    const selectedCoach = coaches.find(c => c.uid === data.coachId);
    if (!selectedCoach) {
      toast({ title: "Error", description: "Selected coach not found.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateDummyDataForCoach({ coachId: selectedCoach.uid, coachName: selectedCoach.displayName });
      toast({
        title: "Dummy Data Generation Complete",
        description: `${result.clientsCreated} clients and ${result.sessionsCreated} sessions created for ${selectedCoach.displayName}.`,
        duration: 7000,
      });
    } catch (error: any) {
      // Log the full error object to the console for detailed inspection
      console.error("Detailed error during dummy data generation:", error);
      
      // Create a more informative description for the user toast
      let description = "An unexpected error occurred. Check the browser console for details.";
      if (error.code === 'permission-denied') {
        description = "Permission denied. Please ensure your Firestore security rules allow admins to create users and sessions. Check the console for the exact failed operation.";
      } else if (error.message) {
        description = error.message;
      }
      
      toast({
        title: "Dummy Data Generation Failed",
        description: description,
        variant: "destructive",
        duration: 9000, // Increase duration to allow reading
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
                  <AlertDescription>Dummy data generation is disabled because Firebase is not configured.</AlertDescription>
              </Alert>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleGenerateData)} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select a coach from the dropdown below to generate sample clients and session data for them.
                  This is useful for demonstrating the coach's dashboard and client list features without affecting real client data.
                </p>
                <FormField
                  control={form.control}
                  name="coachId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Coach</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isFetchingCoaches || coaches.length === 0 || !firebaseAvailable}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              isFetchingCoaches ? "Loading coaches..." : 
                              coaches.length === 0 ? "No coaches found" : "Select a coach to generate data for"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {coaches.map(coach => (
                            <SelectItem key={coach.uid} value={coach.uid}>
                              {coach.displayName} ({coach.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={isGenerating || !firebaseAvailable || isFetchingCoaches || !form.formState.isValid}
                  variant="outline"
                  className="hover:border-primary"
                >
                  {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Database className="mr-2 h-4 w-4" />
                  )}
                  Generate Data for Selected Coach
                </Button>
                {isGenerating && <p className="text-sm text-primary mt-2">Generating data, please wait...</p>}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
