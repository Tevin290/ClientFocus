
'use client';

import { PageHeader } from "@/components/shared/page-header";
import { DollarSign, Loader2, TriangleAlert } from "lucide-react";
import { useRole } from "@/context/role-context";
import { StripeConnectForm } from "@/components/forms/stripe-connect-form";
import { StripeProductsManagement } from "@/components/admin/stripe-products-management";
import { Alert, AlertDescription, AlertTitle as UiAlertTitle } from "@/components/ui/alert";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { BillingDashboard } from "@/components/billing/billing-dashboard";
import { getStripeMode } from "@/lib/stripeClient";


export default function AdminBillingPage() {
  const { companyProfile, isLoading, role, refetchCompanyProfile } = useRole();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [stripeMode, setStripeMode] = useState<'test' | 'live'>('test');

  useEffect(() => {
    setStripeMode(getStripeMode());
  }, []);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const mode = searchParams.get('mode');

    if (success === 'stripe_connected') {
      toast({
        title: 'Stripe Connected',
        description: `Successfully connected your Stripe account in ${mode} mode.`,
      });
      // Refresh company profile to show updated status
      refetchCompanyProfile();
    } else if (error) {
      toast({
        title: 'Connection Failed',
        description: decodeURIComponent(error),
        variant: 'destructive',
      });
    }
  }, [searchParams, toast, refetchCompanyProfile]);

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Billing Management" />
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (role !== 'admin' && role !== 'super-admin') {
      return (
        <div>
          <PageHeader title="Billing Management" description="Oversee client billing, invoices, and payment statuses." />
           <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" />
            <UiAlertTitle>Access Denied</UiAlertTitle>
            <AlertDescription>You must be an Admin to manage Stripe settings.</AlertDescription>
          </Alert>
        </div>
      );
  }

  if (!companyProfile) {
    return (
      <div>
        <PageHeader title="Billing Management" description="Oversee client billing, invoices, and payment statuses." />
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <UiAlertTitle>Company Not Found</UiAlertTitle>
          <AlertDescription>Your account is not associated with a company. Stripe settings cannot be managed.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Billing Management" description="Connect your company's Stripe account to enable client billing." />
      <div className="mt-8">
        <StripeConnectForm companyProfile={companyProfile} />
      </div>
      
      <div className="mt-8">
        <StripeProductsManagement companyProfile={companyProfile} />
      </div>

      {/* Only show billing dashboard to super-admins and if company is onboarded */}
      {role === 'super-admin' && companyProfile?.id && (
        (stripeMode === 'test' && companyProfile?.stripeAccountOnboarded_test) ||
        (stripeMode === 'live' && companyProfile?.stripeAccountOnboarded_live)
      ) && (
        <div className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Billing Dashboard
            </h2>
            <p className="text-muted-foreground">
              Track billing activity and revenue for your company in {stripeMode} mode.
            </p>
          </div>
          <BillingDashboard companyId={companyProfile.id} stripeMode={stripeMode} />
        </div>
      )}
    </div>
  );
}
