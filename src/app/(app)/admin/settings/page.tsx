
'use client';

import React, { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from "@/components/shared/page-header";
import { ProfilePictureForm } from '@/components/forms/profile-picture-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Loader2, TriangleAlert, Building, ToggleRight as SwitchIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateDummyDataForCoach } from '@/lib/dummyDataService';
import { getAllCoaches, type UserProfile } from '@/lib/firestoreService';
import { useRole } from '@/context/role-context';
import { Alert, AlertDescription, AlertTitle as UiAlertTitle } from '@/components/ui/alert';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { migrateDataToCompany } from '@/lib/migrationService';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getStripeMode, setStripeMode } from '@/lib/stripeClient';


const selectCoachSchema = z.object({
  coachId: z.string().min(1, 'Please select a coach.'),
});

type SelectCoachFormValues = z.infer<typeof selectCoachSchema>;

export default function AdminSettingsPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [coaches, setCoaches] = useState<UserProfile[]>([]);
  const [isFetchingCoaches, setIsFetchingCoaches] = useState(true);
  const [isTestMode, setIsTestMode] = useState(true);
  const { toast } = useToast();
  const { user, userProfile, role, isLoading: isRoleLoading } = useRole();
  const [firebaseAvailable, setFirebaseAvailable] = useState(false);

  useEffect(() => {
    setFirebaseAvailable(isFirebaseConfigured());
    setIsTestMode(getStripeMode() === 'test');
  }, []);

  const handleTestModeChange = (checked: boolean) => {
    const newMode = checked ? 'test' : 'live';
    setStripeMode(newMode);
    setIsTestMode(checked);
    toast({
        title: `Stripe mode changed`,
        description: `Stripe is now in ${newMode === 'test' ? 'Test' : 'Live'} mode.`,
    });
  };

  const form = useForm<SelectCoachFormValues>({
    resolver: zodResolver(selectCoachSchema),
  });

  useEffect(() => {
    if (!firebaseAvailable || (role !== 'admin' && role !== 'super-admin')) {
      setIsFetchingCoaches(false);
      return;
    }

    if (userProfile?.companyId) {
      const fetchCoaches = async () => {
        setIsFetchingCoaches(true);
        try {
          const fetchedCoaches = await getAllCoaches(userProfile.companyId!);
          setCoaches(fetchedCoaches);
        } catch (error) {
          console.error("Failed to fetch coaches:", error);
          toast({ title: "Error", description: "Could not load the list of coaches.", variant: "destructive" });
        } finally {
          setIsFetchingCoaches(false);
        }
      };
      fetchCoaches();
    } else if (!isRoleLoading) {
      setIsFetchingCoaches(false);
      if (role === 'admin' || role === 'super-admin') {
        toast({ title: "Warning", description: "Could not determine your company to fetch coaches.", variant: "destructive" });
      }
    }
  }, [firebaseAvailable, role, toast, userProfile, isRoleLoading]);

  const handleGenerateData: SubmitHandler<SelectCoachFormValues> = async (data) => {
    if (!firebaseAvailable || !userProfile?.companyId) {
      toast({ title: "Operation Failed", description: "Firebase is not configured or your company is not set. Cannot generate data.", variant: "destructive" });
      return;
    }

    const selectedCoach = coaches.find(c => c.uid === data.coachId);
    if (!selectedCoach) {
      toast({ title: "Error", description: "Selected coach not found.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateDummyDataForCoach({ 
        coachId: selectedCoach.uid, 
        coachName: selectedCoach.displayName,
        companyId: userProfile.companyId,
      });
      toast({
        title: "Dummy Data Generation Complete",
        description: `${result.clientsCreated} clients and ${result.sessionsCreated} sessions created for ${selectedCoach.displayName}.`,
        duration: 7000,
      });
    } catch (error: any) {
      console.error("Detailed error during dummy data generation:", error);
      
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
        duration: 9000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const runMigration = async () => {
    if (!firebaseAvailable) {
      toast({ title: "Operation Failed", description: "Firebase is not configured.", variant: "destructive" });
      return;
    }
    
    setIsMigrating(true);
    try {
        const result = await migrateDataToCompany({ id: 'hearts-and-minds', name: 'Hearts & Minds' });
        toast({
            title: "Migration Complete",
            description: `Assigned ${result.usersUpdated} users and ${result.sessionsUpdated} sessions to Hearts & Minds.`,
            duration: 7000,
        });
    } catch (error: any) {
        toast({
            title: "Migration Failed",
            description: error.message || "An unexpected error occurred. Check the console.",
            variant: "destructive",
            duration: 9000,
        });
    } finally {
        setIsMigrating(false);
    }
  };


  if (isRoleLoading) {
     return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if ((role !== 'admin' && role !== 'super-admin') || !user || !userProfile) {
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
      <PageHeader title="Application Settings" description="Manage your profile and platform configurations."/>
      <div className="space-y-8 mt-8">
        <ProfilePictureForm user={user} userProfile={userProfile} />

        <Card className="w-full max-w-2xl shadow-light">
            <CardHeader>
                <CardTitle className="font-headline flex items-center">
                    <SwitchIcon className="mr-2 h-5 w-5 text-primary"/>
                    Stripe Mode
                </CardTitle>
                 <CardDescription>
                    Toggle between Stripe's test and live environments. This affects all billing operations.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center space-x-2">
                     <Switch
                      id="stripe-test-mode"
                      checked={isTestMode}
                      onCheckedChange={handleTestModeChange}
                      className={isTestMode ? 'data-[state=checked]:animate-glow-pulse' : ''}
                      aria-label="Stripe Test Mode"
                    />
                    <Label htmlFor="stripe-test-mode" className="font-medium">
                      {isTestMode ? 'Test Mode Enabled' : 'Live Mode Enabled'}
                    </Label>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                    {isTestMode ? 'You are currently using Stripe test keys. No real charges will be made.' : 'You are in live mode. Real charges will be processed.'}
                </p>
            </CardContent>
        </Card>

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
                <h4 className="font-medium text-foreground">Generate Dummy Data</h4>
                <p className="text-sm text-muted-foreground">
                  Select a coach from the dropdown below to generate sample clients and session data for them.
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
                              coaches.length === 0 ? "No coaches found for your company" : "Select a coach to generate data for"
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

            {role === 'super-admin' && (
              <>
                <Separator className="my-6" />
                <div>
                  <h4 className="font-medium text-foreground">Multi-Tenant Migration</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    This is a one-time action to prepare for a multi-tenant architecture. It will create a "Hearts & Minds" company and assign all existing users and sessions to it. This action is irreversible.
                  </p>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                          disabled={isMigrating || !firebaseAvailable}
                          variant="destructive"
                          className="mt-4"
                      >
                          {isMigrating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Building className="mr-2 h-4 w-4" />}
                          Migrate All Data to Hearts & Minds
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will modify every user and session document to assign them to the 'Hearts & Minds' company. This is a critical step for multi-tenancy and cannot be easily undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={runMigration}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  
                  {isMigrating && <p className="text-sm text-destructive mt-2">Migrating all data, please wait. Do not close this page.</p>}
                </div>
              </>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    
