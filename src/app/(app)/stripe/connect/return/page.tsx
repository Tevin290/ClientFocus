/* eslint-disable react/no-unescaped-entities */

'use client';

import React, { useEffect } from 'react';
import { useRole } from '@/context/role-context';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getStripeMode } from '@/lib/stripeClient';

export default function StripeReturnPage() {
  const { refetchCompanyProfile, companyProfile, isLoading } = useRole();
  const stripeMode = getStripeMode();

  useEffect(() => {
    // Refetch the company profile to get the latest Stripe onboarding status
    refetchCompanyProfile();
  }, [refetchCompanyProfile]);

  // Check if account is fully onboarded by verifying with Stripe
  useEffect(() => {
    const checkAccountStatus = async () => {
      if (!companyProfile) return;
      
      const accountId = stripeMode === 'test' 
        ? companyProfile.stripeAccountId_test 
        : companyProfile.stripeAccountId_live;
      
      if (accountId && !isLoading) {
        try {
          const response = await fetch(`/api/stripe/account/status?accountId=${accountId}&mode=${stripeMode}`);
          const data = await response.json();
          
          if (data.chargesEnabled && data.payoutsEnabled) {
            // Account is fully onboarded, update the company profile
            const fieldSuffix = stripeMode === 'test' ? '_test' : '_live';
            const updateResponse = await fetch('/api/company/update-stripe-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                companyId: companyProfile.id,
                [`stripeAccountOnboarded${fieldSuffix}`]: true
              })
            });
            
            if (updateResponse.ok) {
              refetchCompanyProfile();
            }
          }
        } catch (error) {
          console.error('Error checking account status:', error);
        }
      }
    };

    checkAccountStatus();
  }, [companyProfile, stripeMode, isLoading, refetchCompanyProfile]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Finalizing Stripe Connection...</p>
      </div>
    );
  }

  const isOnboarded = stripeMode === 'test' 
    ? companyProfile?.stripeAccountOnboarded_test 
    : companyProfile?.stripeAccountOnboarded_live;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
          {isOnboarded ? (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="mt-4 text-2xl font-headline">Connection Successful!</CardTitle>
              <CardDescription>
                Your Stripe account has been successfully connected in {stripeMode} mode. You can now manage client billing.
              </CardDescription>
            </>
          ) : (
             <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
                <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <CardTitle className="mt-4 text-2xl font-headline">Onboarding Incomplete</CardTitle>
              <CardDescription>
                Your Stripe account is linked, but not yet active. To finish, please return to your billing settings and click "Continue Onboarding" to provide the remaining details to Stripe.
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
