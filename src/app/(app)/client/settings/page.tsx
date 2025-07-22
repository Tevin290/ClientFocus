/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Save, TriangleAlert, Users, CreditCard, CheckCircle, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAllCoaches, updateUserProfile, type UserProfile } from '@/lib/firestoreService';
import { useRole } from '@/context/role-context';
import { Alert, AlertDescription, AlertTitle as UiAlertTitle } from '@/components/ui/alert';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProfilePictureForm } from '@/components/forms/profile-picture-form';
import { createCheckoutSetupSession, createCustomerPortalSession } from '@/lib/stripeService';
import { useRouter, useSearchParams } from 'next/navigation';

const selectCoachSchema = z.object({
  coachId: z.string().min(1, 'Please select a coach.'),
});

type SelectCoachFormValues = z.infer<typeof selectCoachSchema>;

export default function ClientSettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userProfile, companyProfile, isLoading: isRoleLoading, role, refetchUserProfile } = useRole();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isRedirectingToStripe, setIsRedirectingToStripe] = useState(false);
  const [isRedirectingToPortal, setIsRedirectingToPortal] = useState(false);
  const [coaches, setCoaches] = useState<UserProfile[]>([]);
  const [isFetchingCoaches, setIsFetchingCoaches] = useState(true);
  const [firebaseAvailable, setFirebaseAvailable] = useState(false);
  const [localStripeMode, setLocalStripeMode] = useState<'test' | 'live'>('test');
  
  // Use local mode instead of the server hook to avoid permission errors for clients
  const stripeMode = localStripeMode;

  useEffect(() => {
    setFirebaseAvailable(isFirebaseConfigured());
    
    // Initialize local stripe mode from localStorage
    import('@/lib/stripeClient').then(({ getStripeMode }) => {
      setLocalStripeMode(getStripeMode());
    });

    if (searchParams.get('payment_setup_success')) {
        toast({
            title: "Payment Method Added!",
            description: "Your payment method has been saved successfully.",
            variant: "default",
        });
        refetchUserProfile();
        router.replace('/client/settings');
    }
    if (searchParams.get('payment_setup_cancelled')) {
        toast({
            title: "Payment Setup Cancelled",
            description: "You can add a payment method at any time.",
            variant: "destructive",
        });
        router.replace('/client/settings');
    }
  }, [searchParams, toast, refetchUserProfile, router]);

  const form = useForm<SelectCoachFormValues>({
    resolver: zodResolver(selectCoachSchema),
    defaultValues: {
        coachId: userProfile?.coachId || '',
    }
  });

  useEffect(() => {
    if (userProfile?.coachId) {
        form.reset({ coachId: userProfile.coachId });
    }
  }, [userProfile, form]);

  useEffect(() => {
    if (!firebaseAvailable || !userProfile?.companyId) {
      setIsFetchingCoaches(false);
      return;
    }
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
  }, [firebaseAvailable, toast, userProfile?.companyId]);

  const currentCoachName = useMemo(() => {
    return coaches.find(c => c.uid === userProfile?.coachId)?.displayName || "Not Assigned";
  }, [coaches, userProfile]);

  const handleUpdateCoach: SubmitHandler<SelectCoachFormValues> = async (data) => {
    if (!firebaseAvailable || !user?.uid) {
      toast({ title: "Operation Failed", description: "Cannot save settings. User not found or Firebase is unavailable.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await updateUserProfile(user.uid, { coachId: data.coachId });
      await refetchUserProfile();
      toast({
        title: "Coach Updated!",
        description: `Your coach has been successfully updated.`,
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Could not update your coach. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const companyStripeAccountId = stripeMode === 'test' ? companyProfile?.stripeAccountId_test : companyProfile?.stripeAccountId_live;
  const isCompanyOnboarded = stripeMode === 'test' ? companyProfile?.stripeAccountOnboarded_test : companyProfile?.stripeAccountOnboarded_live;
  
  // Get the correct stripe customer ID based on mode, but ensure it's not empty/undefined
  const clientStripeCustomerId = (() => {
    const rawId = stripeMode === 'test' ? userProfile?.stripeCustomerId_test : userProfile?.stripeCustomerId_live;
    return rawId && rawId.trim().length > 0 ? rawId : null;
  })();
  
  const clientStripeCustomerIdField = stripeMode === 'test' ? 'stripeCustomerId_test' : 'stripeCustomerId_live';
  
  // Debug logging (remove in production)
  console.log('Client Settings Debug:', {
    stripeMode,
    userProfile: userProfile ? {
      uid: userProfile.uid,
      email: userProfile.email,
      stripeCustomerId_test: userProfile.stripeCustomerId_test,
      stripeCustomerId_live: userProfile.stripeCustomerId_live,
    } : null,
    clientStripeCustomerId,
    isCompanyOnboarded,
    companyStripeAccountId
  });

  const handleAddPaymentMethod = async () => {
    if (!companyStripeAccountId || !user || !userProfile?.companyId) {
        toast({ title: "Error", description: `Billing is not enabled for this company in ${stripeMode} mode.`, variant: "destructive" });
        return;
    }
    setIsRedirectingToStripe(true);
    try {
        const { url, newStripeCustomerId, error } = await createCheckoutSetupSession(
          userProfile.companyId, 
          companyStripeAccountId, 
          user.uid, 
          user.email!,
          clientStripeCustomerId || undefined,
          stripeMode
        );

        if (error || !url) {
            throw new Error(error || 'Failed to create Stripe session.');
        }

        if (newStripeCustomerId) {
            await updateUserProfile(user.uid, { [clientStripeCustomerIdField]: newStripeCustomerId });
        }

        window.location.href = url;
    } catch (err: any) {
        toast({ title: "Could not connect to Stripe", description: err.message, variant: "destructive"});
        setIsRedirectingToStripe(false);
    }
  }

  const handleEditPaymentMethod = async () => {
    if (!companyStripeAccountId || !clientStripeCustomerId) {
        toast({ title: "Error", description: "Payment method information not available.", variant: "destructive" });
        return;
    }
    setIsRedirectingToPortal(true);
    try {
        const { url, error } = await createCustomerPortalSession(
          companyStripeAccountId,
          clientStripeCustomerId!, // Non-null assertion since we check above
          stripeMode
        );

        if (error || !url) {
            throw new Error(error || 'Failed to create customer portal session.');
        }

        window.location.href = url;
    } catch (err: any) {
        toast({ title: "Could not open payment portal", description: err.message, variant: "destructive"});
        setIsRedirectingToPortal(false);
    }
  }

  if (isRoleLoading) {
     return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (role !== 'client' || !user || !userProfile) {
    return (
      <div>
        <PageHeader title="My Settings"/>
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <UiAlertTitle>Access Denied</UiAlertTitle>
          <AlertDescription>You must be a client to view this page.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="My Settings" description="Manage your coach assignment and profile details."/>
      <div className="space-y-8 mt-8">
        <ProfilePictureForm user={user} userProfile={userProfile} />

        <Card className="w-full max-w-2xl shadow-light">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <CreditCard className="mr-2 h-5 w-5 text-primary" />
              Payment Method ({stripeMode} mode)
            </CardTitle>
            <CardDescription>
                {clientStripeCustomerId ? `Your payment method for ${stripeMode} mode is on file.` : `Add a payment method to allow for session billing in ${stripeMode} mode.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clientStripeCustomerId ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-3 rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                        <div>
                            <p className="font-semibold text-green-800 dark:text-green-200">Payment Method on File</p>
                            <p className="text-sm text-green-700 dark:text-green-300">
                               Your account is ready for billing in {stripeMode} mode.
                            </p>
                        </div>
                    </div>
                    <Button 
                        onClick={handleEditPaymentMethod} 
                        disabled={isRedirectingToPortal || !isCompanyOnboarded}
                        variant="outline"
                    >
                        {isRedirectingToPortal ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Settings className="mr-2 h-4 w-4" />
                        )}
                        {isRedirectingToPortal ? 'Opening Portal...' : 'Edit Payment Method'}
                    </Button>
                </div>
            ) : (
                <Button onClick={handleAddPaymentMethod} disabled={isRedirectingToStripe || !isCompanyOnboarded}>
                    {isRedirectingToStripe ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <CreditCard className="mr-2 h-4 w-4" />
                    )}
                    {isRedirectingToStripe ? 'Redirecting...' : 'Add Payment Method'}
                </Button>
            )}
            {!isCompanyOnboarded && !clientStripeCustomerId && (
                <p className="text-xs text-muted-foreground mt-2">Your coach's company has not enabled billing in {stripeMode} mode yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="w-full max-w-2xl shadow-light">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" />
              Manage Your Coach
            </CardTitle>
            <CardDescription>Your current coach is <span className="font-bold text-primary">{currentCoachName}</span>. You can select a new coach from the list below.</CardDescription>
          </CardHeader>
          <CardContent>
            {!firebaseAvailable && (
               <Alert variant="destructive" className="mb-4">
                  <TriangleAlert className="h-4 w-4" />
                  <UiAlertTitle>Firebase Not Configured</UiAlertTitle>
                  <AlertDescription>This feature is disabled because Firebase is not configured.</AlertDescription>
              </Alert>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleUpdateCoach)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="coachId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select a New Coach</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isFetchingCoaches || coaches.length === 0 || !firebaseAvailable || isSaving}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              isFetchingCoaches ? "Loading coaches..." : 
                              coaches.length === 0 ? "No coaches available" : "Select a coach"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {coaches.map(coach => (
                            <SelectItem key={coach.uid} value={coach.uid}>
                              {coach.displayName}
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
                  disabled={isSaving || !firebaseAvailable || isFetchingCoaches || !form.formState.isDirty}
                  variant="default"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
