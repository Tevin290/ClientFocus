
'use client';

import React, { useEffect } from 'react';
import { useRole } from '@/context/role-context';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function StripeReturnPage() {
  const { refetchCompanyProfile, companyProfile, isLoading } = useRole();

  useEffect(() => {
    // Refetch the company profile to get the latest Stripe onboarding status
    refetchCompanyProfile();
  }, [refetchCompanyProfile]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Finalizing Stripe Connection...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
          {companyProfile?.stripeAccountOnboarded ? (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="mt-4 text-2xl font-headline">Connection Successful!</CardTitle>
              <CardDescription>
                Your Stripe account has been successfully connected. You can now manage client billing.
              </CardDescription>
            </>
          ) : (
             <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
                <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <CardTitle className="mt-4 text-2xl font-headline">Onboarding Incomplete</CardTitle>
              <CardDescription>
                Your Stripe account is linked, but onboarding is not complete. Please return to your billing settings and complete the required steps in Stripe to activate your account.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/admin/billing">Return to Billing Settings</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
